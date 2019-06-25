import * as http from "http";
import * as WebSocket from "ws";
import { Server } from './Server';
import { ApiCall } from './RPCCall';

/**
 * 当前活跃的连接
 */
export class ActiveConnection<SessionData = any> {

    readonly options: ActiveConnectionOptions<SessionData>;
    readonly server: Server;
    readonly client: WebSocket;
    readonly request: http.IncomingMessage;
    readonly connId: number;
    readonly ip: string;
    readonly sessionData: SessionData;

    constructor(options: ActiveConnectionOptions<SessionData>) {
        this.options = options;
        this.server = options.server;
        this.client = options.client;
        this.request = options.request;
        this.ip = this._getClientIp(options.request);
        this.connId = options.connId;
        this.sessionData = options.sessionData;
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
    listenMsg() { };
    unlistenMsg() { };

    // Send Msg
    sendMsg() { };

    sendApiSucc(call: ApiCall<any>, body: any) {
        // TODO

        // TEST
        this.client.send(`API SUCC SN=${call.sn} SVC_ID=${call.service.id} body=${body}`);
    }

    sendApiError(call: ApiCall<any>, body: { errMsg: string, errInfo?: any }) {
        // TODO
    }
}

export interface ActiveConnectionOptions<SessionData> {
    connId: number,
    server: Server,
    client: WebSocket,
    request: http.IncomingMessage,
    sessionData: SessionData,
    onClose: (conn: ActiveConnection<SessionData>, code: number, reason: string) => void
}