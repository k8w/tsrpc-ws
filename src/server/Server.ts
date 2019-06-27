import { ServiceProto, ApiServiceDef, MsgServiceDef } from '../proto/ServiceProto';
import * as WebSocket from 'ws';
import { Server as WebSocketServer } from 'ws';
import * as http from "http";
import { ActiveConnection } from './ActiveConnection';
import { TSBuffer } from 'tsbuffer';
import * as fs from "fs";
import * as path from "path";
import { ApiCall, MsgCall } from './RPCCall';
import { Counter } from '../models/Counter';
import { Logger } from './Logger';
import { ServiceMap, Transporter, RecvData } from '../models/Transporter';
import { HandlerManager } from '../models/HandlerManager';

export interface BaseServerCustomType {
    req: any,
    res: any,
    msg: any,
    session: any
}

export class Server<ServerCustomType extends BaseServerCustomType = any> {

    // Flow return 代表是否继续执行后续流程
    readonly apiFlow: ApiFlowItem[] = [];
    readonly msgFlow: MsgFlowItem[] = [];

    private _wsServer?: WebSocketServer;
    private readonly _conns: ActiveConnection<ServerCustomType>[] = [];
    private readonly _id2Conn: { [connId: number]: ActiveConnection<ServerCustomType> | undefined } = {};

    // 配置及其衍生项
    private readonly _options: ServerOptions;
    readonly proto: ServiceProto;
    private _tsbuffer: TSBuffer;
    private _serviceMap: ServiceMap;

    private _connIdCounter = new Counter();

    // Handlers
    private _apiHandlers: { [apiName: string]: ApiHandler | undefined } = {};
    // 多个Handler将异步并行执行
    private _msgHandlers = new HandlerManager;

    constructor(options: Pick<ServerOptions, 'proto'> & Partial<ServerOptions>) {
        this._options = Object.assign({}, defaultServerOptions, options);

        if (typeof (this._options.proto) === 'string') {
            try {
                this.proto = JSON.parse(fs.readFileSync(this._options.proto).toString());
            }
            catch (e) {
                console.error(e);
                throw new Error('打开Proto文件失败: ' + path.resolve(this._options.proto));
            }
        }
        else {
            this.proto = this._options.proto;
        }

        this._tsbuffer = new TSBuffer(this.proto.types);
        this._serviceMap = Transporter.getServiceMap(this.proto);

        // 自动注册API
        if (options.apiPath) {
            // TODO
        }
    }

    // ConnID 1 ~ Number.MAX_SAFE_INTEGER
    getNextConnId(): number {
        // 最多尝试1万次
        for (let i = 0; i < 10000; ++i) {
            let connId = this._connIdCounter.getNext();
            if (!this._id2Conn[connId]) {
                return connId;
            }
        }

        console.error('No available connId till ' + this._connIdCounter.last);
        return NaN;
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

    private _onClientConnect = (ws: WebSocket, req: http.IncomingMessage) => {
        let connId = this.getNextConnId()
        if (isNaN(connId)) {
            ws.close();
            return;
        }

        // Create Active Connection
        let conn = new ActiveConnection({
            connId: connId,
            server: this,
            ws: ws,
            request: req,
            session: this._options.defaultSessionData,
            tsbuffer: this._tsbuffer,
            serviceMap: this._serviceMap,
            onClose: this._onClientClose,
            onRecvData: this._onRecvData
        });
        this._conns.push(conn);
        this._id2Conn[conn.connId] = conn;

        ws.on('error', e => { this._onClientError(conn, e) });
        ws.on('close', (code, reason) => { this._onClientClose(conn, code, reason) });

        console.log('[CLIENT_CONNECT]', `IP=${conn.ip}`, `ConnID=${conn.connId}`, `ActiveConn=${this._conns.length}`);
    };

    private _onRecvData = (conn: ActiveConnection<ServerCustomType>, recvData: RecvData) => {
        if (recvData.type === 'text') {
            console.debug('[RECV_TXT]', recvData.data);
            if (recvData.data === 'status') {
                conn.sendRaw(`Status:\n${JSON.stringify(this.status, null, 2)}`)
            }
        }
        else if (recvData.type === 'apiReq') {
            this._handleApi(conn, recvData.service, recvData.sn, recvData.data);
        }
        else if (recvData.type === 'msg') {
            this._handleMsg(conn, recvData.service, recvData.data);
        }
        else {
            console.warn('[UNRESOLVED_BUFFER]', recvData.data);
        }
    }

    private _onClientError(conn: ActiveConnection<ServerCustomType>, e: Error) {
        console.warn('[CLIENT_ERROR]', e);
    }

    private _onClientClose(conn: ActiveConnection<ServerCustomType>, code: number, reason: string) {
        this._conns.removeOne(v => v.connId === conn.connId);
        this._id2Conn[conn.connId] = undefined;
        console.log('[CLIENT_CLOSE]', `IP=${conn.ip} ConnID=${conn.connId} Code=${code} ${reason ? `Reason=${reason} ` : ''}ActiveConn=${this._conns.length}`);
    }

    private async _handleApi(conn: ActiveConnection<ServerCustomType>, service: ApiServiceDef, sn: number, reqBody: any) {
        // Create ApiCall
        let call: ApiCall<any, any> = {
            service: service,
            sn: sn,
            conn: conn,
            data: reqBody,
            logger: new Logger(() => [`API#${sn}`, service.name], conn.logger),
            succ: (resBody) => {
                conn.sendApiSucc(call, resBody);
                call.output = resBody;
            },
            error: (message, info) => {
                call.output = {
                    message: message,
                    info: info
                }
                conn.sendApiError(call, call.output);
            }
        }

        call.logger.log('Req', call.data);

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
        let handler = this._apiHandlers[service.name];
        if (handler) {
            let res = handler(call);
            if (res instanceof Promise) {
                await res;
            }
        }
        // 未找到ApiHandler，且未进行任何输出
        else if (!call.output) {
            call.error('Unhandled API', 'UNHANDLED_API')
        }
    }

    private async _handleMsg(conn: ActiveConnection<ServerCustomType>, service: MsgServiceDef, msgBody: any) {
        // Create MsgCall
        let call: MsgCall = {
            conn: conn,
            service: service,
            data: msgBody,
            logger: new Logger(() => ['MSG', service.name], conn.logger)
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
        if (!this._msgHandlers.forEachHandler(service.name, call)) {
            console.debug('[UNHANDLED_MSG]', service.name);
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
    implementApi<T extends keyof ServerCustomType['req']>(apiName: T, handler: ApiHandler<ServerCustomType['req'][T], ServerCustomType['res'][T], ServerCustomType>) {
        if (this._apiHandlers[apiName as string]) {
            throw new Error('Already exist handler for API: ' + apiName);
        }
        this._apiHandlers[apiName as string] = handler;
    };

    // Msg 可以重复监听
    listenMsg<T extends keyof ServerCustomType['msg']>(msgName: T, handler: MsgHandler<ServerCustomType['msg'][T], ServerCustomType>) {
        this._msgHandlers.addHandler(msgName as string, handler);
    };

    unlistenMsg<T extends keyof ServerCustomType['msg']>(msgName: T, handler?: MsgHandler<ServerCustomType['msg'][T], ServerCustomType>) {
        this._msgHandlers.removeHandler(msgName as string, handler);
    };

    // Send Msg
    sendMsg(connId: string | string[], msgId: string) {
        // TODO
    };

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

export type ApiHandler<
    Req = any,
    Res = any,
    ServerCustomType extends BaseServerCustomType = any
    > = (call: ApiCall<Req, Res, ServerCustomType>) => void | Promise<void>;
export type MsgHandler<
    Msg = any, ServerCustomType extends BaseServerCustomType = any
    > = (msg: MsgCall<Msg, ServerCustomType>) => void | Promise<void>;

// Flow：return true 代表继续flow，否则为立即中止
export type ApiFlowItem<
    Req = any,
    Res = any,
    ServerCustomType extends BaseServerCustomType = any
    > = (call: ApiCall<Req, Res, ServerCustomType>) => boolean | Promise<boolean>;
export type MsgFlowItem<
    Msg = any,
    ServerCustomType extends BaseServerCustomType = any
    > = (msg: MsgCall<Msg, ServerCustomType>) => boolean | Promise<boolean>;