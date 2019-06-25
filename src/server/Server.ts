import { ServiceProto, ApiServiceDef, MsgServiceDef } from './proto/ServiceProto';
import * as WebSocket from 'ws';
import { Server as WebSocketServer } from 'ws';
import * as http from "http";
import { ActiveConnection } from './ActiveConnection';
import { TSBuffer } from 'tsbuffer';
import * as fs from "fs";
import * as path from "path";
import { ApiCall, MsgCall } from './RPCCall';
import { ServerInputData } from '../proto/TransportData';

/** 传输数据 编解码器 */
const transportCoder = new TSBuffer({
    "ServerInputData": {
        "type": "Tuple",
        "elementTypes": [
            {
                "type": "Number",
                "scalarType": "uint"
            },
            {
                "type": "Buffer",
                "arrayType": "Uint8Array"
            },
            {
                "type": "Number",
                "scalarType": "uint"
            }
        ],
        "optionalStartIndex": 2
    },
    "ServerOutputData": {
        "type": "Tuple",
        "elementTypes": [
            {
                "type": "Number",
                "scalarType": "uint"
            },
            {
                "type": "Buffer",
                "arrayType": "Uint8Array"
            },
            {
                "type": "Number",
                "scalarType": "uint"
            },
            {
                "type": "Boolean"
            }
        ],
        "optionalStartIndex": 2
    }
})

export class Server {

    // Flow return 代表是否继续执行后续流程
    readonly apiFlow: ((call: ApiCall<any>) => (boolean | Promise<boolean>))[] = [];
    readonly msgFlow: ((call: MsgCall<any>) => (boolean | Promise<boolean>))[] = [];

    private _wsServer?: WebSocketServer;
    private readonly _conns: ActiveConnection[] = [];
    private readonly _id2Conn: { [connId: number]: ActiveConnection | undefined } = {};

    private readonly _options: ServerOptions;
    readonly services: ServiceProto['services'];
    readonly tsbuffer: TSBuffer;

    // Handlers
    private _apiHandlers: { [apiName: string]: ((call: ApiCall<any>) => void | Promise<void>) | undefined } = {};
    // 多个Handler将异步并行执行
    private _msgHandlers: { [msgName: string]: ((call: MsgCall<any>) => void | Promise<void>)[] | undefined } = {};

    constructor(options: Pick<ServerOptions, 'proto'> & Partial<ServerOptions>) {
        this._options = Object.assign({}, defaultServerOptions, options);

        let serviceProto: ServiceProto;
        if (typeof (this._options.proto) === 'string') {
            try {
                serviceProto = JSON.parse(fs.readFileSync(this._options.proto).toString());
            }
            catch (e) {
                console.error(e);
                throw new Error('打开Proto文件失败: ' + path.resolve(this._options.proto));
            }
        }
        else {
            serviceProto = this._options.proto;
        }
        this.services = serviceProto.services;
        this.tsbuffer = new TSBuffer(serviceProto.types);

        // 自动注册API
        if (options.apiPath) {
            // TODO
        }
    }

    // ConnID 1 ~ Number.MAX_SAFE_INTEGER
    private _nextConnId: number = 0;
    getNextConnId(): number {
        while (true) {
            // 确保ConnID在 1~MAX_SAFE_INTEGER 之间
            if (this._nextConnId >= Number.MAX_SAFE_INTEGER) {
                this._nextConnId = 0;
            }

            if (!this._id2Conn[++this._nextConnId]) {
                return this._nextConnId;
            }
        }
    }

    /**
     * 启动服务
     * @param port 要监听的端口号，不填写则使用`ServerOptions`中的
     * @returns 成功监听的端口号
     */
    async start(port?: number): Promise<number> {
        if (this._wsServer) {
            throw new Error('Server has been started already');
        }

        port = port || this._options.port;
        return new Promise(rs => {
            this._wsServer = new WebSocketServer({
                port: port
            }, () => {
                console.log(`Server started at ${port}...`);
                rs(port!);
            });

            this._wsServer.on('connection', this._onClientConnect);
            this._wsServer.on('error', e => {
                console.error('[SVR_ERROR]', e);
            });
        })
    }

    private _onClientConnect = (client: WebSocket, req: http.IncomingMessage) => {
        // Create Active Connection
        let conn = new ActiveConnection({
            connId: this.getNextConnId(),
            server: this,
            client: client,
            request: req,
            sessionData: this._options.defaultSessionData,
            onClose: this._onClientClose
        });
        this._conns.push(conn);
        this._id2Conn[conn.connId] = conn;

        client.on('message', data => { this._onClientMessage(conn, data) });
        client.on('error', e => { this._onClientError(conn, e) });
        client.on('close', (code, reason) => { this._onClientClose(conn, code, reason) });

        console.log('[CLIENT_CONNECT]', `IP=${conn.ip}`, `ConnID=${conn.connId}`, `ActiveConn=${this._conns.length}`);
    };

    private _onClientMessage(conn: ActiveConnection, data: WebSocket.Data) {
        // 文字消息，通常用于调试，直接打印
        if (typeof data === 'string') {
            console.debug('[RECV_TXT]', data);
            if (data === 'status') {
                conn.client.send(`Status:\n${JSON.stringify(this.status, null, 2)}`)
            }
        }
        else if (Buffer.isBuffer(data)) {
            // 解码ServerInputData
            let decRes = this._tryDecode(transportCoder, data, 'ServerInputData');
            if (!decRes.isSucc) {
                console.error('[INVALID_DATA]', 'Cannot decode data', `data.length=${data.length}`, decRes.error);
                return;
            }
            let transportData = decRes.output as ServerInputData;

            // 确认是哪个Service
            let service = this.services[transportData[0]];
            if (!service) {
                console.error('[INVALID_DATA]', `Cannot find service ID: ${transportData[0]}`);
                return;
            }

            // Handle API
            if (service.type === 'api') {
                let sn = transportData[2] as number | undefined;
                if (sn === undefined) {
                    console.error('[INVALID_DATA]', 'Missing API SN', `data.length=${data.length}`);
                    return;
                }

                // Parse body
                let decRes = this._tryDecode(this.tsbuffer, transportData[1], service.req);
                if (!decRes.isSucc) {
                    console.error('[INVALID_REQ]', decRes.error);
                    // TODO res error
                    return;
                }
                let reqBody = decRes.output as any;

                this._handleApi(conn, service, sn, reqBody)
            }
            // Handle Msg
            else {
                // Parse body
                let decRes = this._tryDecode(this.tsbuffer, transportData[1], service.schema);
                if (!decRes.isSucc) {
                    console.error('[INVALID_MSG]', decRes.error);
                    // TODO res error
                    return;
                }
                let msgBody = decRes.output as any;

                this._handleMsg(conn, service, msgBody);
            }
        }
        else {
            console.warn('Unexpected message type', data);
        }
    }

    private _onClientError(conn: ActiveConnection, e: Error) {
        console.warn('[CLIENT_ERROR]', e);
    }

    private _onClientClose(conn: ActiveConnection, code: number, reason: string) {
        this._conns.removeOne(v => v.connId === conn.connId);
        this._id2Conn[conn.connId] = undefined;
        console.log('[CLIENT_CLOSED]', `IP=${conn.ip}`, `Code=${code}`, `Reason=${reason || ''}`, `ActiveConn=${this._conns.length}`);
    }

    private _tryEncode(encoder: TSBuffer, value: any, schemaId: string): { isSucc: true, output: Uint8Array } | { isSucc: false, error: Error } {
        try {
            let output = encoder.encode(value, schemaId);
            return {
                isSucc: true,
                output: output
            }
        }
        catch (e) {
            return {
                isSucc: false,
                error: e
            }
        }
    }

    private _tryDecode(decoder: TSBuffer, buf: Uint8Array, schemaId: string): { isSucc: true, output: unknown } | { isSucc: false, error: Error } {
        try {
            let output = decoder.decode(buf, schemaId);
            return {
                isSucc: true,
                output: output
            }
        }
        catch (e) {
            return {
                isSucc: false,
                error: e
            }
        }
    }

    private async _handleApi(conn: ActiveConnection, service: ApiServiceDef, sn: number, reqBody: any) {
        // Create ApiCall
        let call: ApiCall<any> = {
            service: service,
            sn: sn,
            conn: conn,
            data: reqBody,

            log: (...args: any) => {
                console.log('[API]', service.name, `${conn.connId}-${sn}`, ...args);
            },
            succ: (resBody) => {
                conn.sendApiSucc(call, resBody);
                call.output = resBody;
            },
            error: (errMsg, errInfo) => {
                call.output = {
                    errMsg: errMsg,
                    errInfo: errInfo
                }
                conn.sendApiError(call, call.output);
            }
        }

        // ApiFlow
        for (let func of this.apiFlow) {
            let res = func(call);
            if (res instanceof Promise) {
                res = await res;
            }

            // Return true 表示继续后续流程 否则表示立即中止
            if (!res) {
                return;
            }
        }

        // ApiHandler
        if (this._apiHandlers[service.name]) {
            let res = this._apiHandlers[service.name];
            if (res instanceof Promise) {
                await res;
            }
        }
        // 未找到ApiHandler，且未进行任何输出
        else if (!call.output) {
            call.error('Unhandled API', 'UNHANDLED_API')
        }
    }

    private async _handleMsg(conn: ActiveConnection, service: MsgServiceDef, msgBody: any) {
        // Create MsgCall
        let call: MsgCall<any> = {
            conn: conn,
            service: service,
            data: msgBody,
            log: (...args: any) => {
                console.log('[MSG]', service.name, `${conn.connId}`, ...args);
            }
        }

        // MsgFlow
        for (let func of this.msgFlow) {
            let res = func(call);
            if (res instanceof Promise) {
                res = await res;
            }

            // Return true 表示继续后续流程 否则表示立即中止
            if (!res) {
                return;
            }
        }

        // MsgHandler
        let handlers = this._msgHandlers[service.name];
        if (handlers) {
            for (let handler of handlers) {
                handler(call);
            }
        }
        else {
            console.warn('[UNHANDLED_MSG]', service.name);
        }
    }

    async stop(immediately: boolean = false): Promise<void> {
        return new Promise(rs => {
            if (!this._wsServer) {
                throw new Error('Server has not been started')
            }

            if (immediately) {
                this._wsServer.close(() => { rs(); })
            }
            else {
                // TODO 优雅的停止
            }
        })
    }

    // API 只能实现一次
    implementApi() { };

    // Msg 可以重复监听
    listenMsg() { };
    unlistenMsg() { };

    // Send Msg
    sendMsg(connId: string | string[], msgId: string) { };

    get status() {
        return {
            activeConn: this._conns.length
        }
    }
}

const defaultServerOptions: ServerOptions = {
    port: 3000,
    proto: {
        services: [],
        types: {}
    },
    defaultSessionData: {}
}

// event => event data
export interface ServerEventData {
    sendMsg: any,
    resSucc: any,
    resError: any
}

export type ServerOptions = {
    port: number;
    proto: string | ServiceProto;
    apiPath?: string;
    defaultSessionData: any;    // TODO
};