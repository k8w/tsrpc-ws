import * as http from "http";
import * as WebSocket from "ws";
import { Server, BaseServerCustomType } from './Server';
import { ApiCall } from './RPCCall';
import { Logger } from './Logger';
import { Transporter, ServiceMap, RecvData } from '../models/Transporter';
import { TSBuffer } from "tsbuffer";

/**
 * 当前活跃的连接
 */
export class ActiveConnection<ServerCustomType extends BaseServerCustomType = any> {

    readonly options: ActiveConnectionOptions<ServerCustomType>;
    readonly server: Server<ServerCustomType>;
    readonly request: http.IncomingMessage;
    readonly connId: number;
    readonly ip: string;
    readonly session: ServerCustomType['session'];
    readonly logger: Logger;

    private _ws: WebSocket;
    private _transporter: Transporter;

    constructor(options: ActiveConnectionOptions<ServerCustomType>) {
        this.options = options;
        this.server = options.server;
        this._ws = options.ws;
        this.request = options.request;
        this.ip = this._getClientIp(options.request);
        this.connId = options.connId;
        this.session = options.session;
        this.logger = new Logger(() => [`Conn${this.connId}(${this.ip})`])
        this._transporter = new Transporter('server', {
            ws: this._ws,
            proto: this.server.proto,
            onRecvData: this._onRecvData,
            tsbuffer: options.tsbuffer,
            serviceMap: options.serviceMap
        })
    }

    private _getClientIp(req: http.IncomingMessage) {
        var ipAddress;
        // The request may be forwarded from local web server.
        var forwardedIpsStr = req.headers['x-forwarded-for'] as string | undefined;
        if (forwardedIpsStr) {
            // 'x-forwarded-for' header may return multiple IP addresses in
            // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
            // the first one
            var forwardedIps = forwardedIpsStr.split(',');
            ipAddress = forwardedIps[0];
        }
        if (!ipAddress) {
            // If request was not forwarded
            ipAddress = req.connection.remoteAddress;
        }
        // Remove prefix ::ffff:
        return ipAddress ? ipAddress.replace(/^::ffff:/, '') : '';
    };

    // Listen Msg
    // listenMsg() { };
    // unlistenMsg() { };

    // Send Msg
    sendMsg<T extends keyof ServerCustomType['msg']>(msgName: T, msg: ServerCustomType['msg'][T]) {
        return this._transporter.sendMsg(msgName as string, msg);
    };

    sendApiSucc(call: ApiCall<any, any>, res: any) {
        if (call.output) {
            return;
        }

        this._transporter.sendApiSucc(call.service, call.sn, res)

        call.output = res;
        call.logger.log('Succ', res)
    }

    sendApiError(call: ApiCall<any, any>, message: string, info?: any) {
        if (call.output) {
            return;
        }

        let err = this._transporter.sendApiError(call.service, call.sn, message, info);

        call.output = err;
        call.logger.log('Error', message, info);
    }

    sendRaw(data: WebSocket.Data) {
        this._ws.send(data);
    }

    private _onRecvData = (data: RecvData) => {
        this.options.onRecvData(this, data);
    }
}

export interface ActiveConnectionOptions<ServerCustomType extends BaseServerCustomType = any> {
    connId: number,
    server: Server<ServerCustomType>,
    ws: WebSocket,
    request: http.IncomingMessage,
    session: ServerCustomType['session'],
    tsbuffer: TSBuffer,
    serviceMap: ServiceMap,
    onClose: (conn: ActiveConnection<ServerCustomType>, code: number, reason: string) => void,
    onRecvData: (conn: ActiveConnection<ServerCustomType>, data: RecvData) => void;
}