import * as http from "http";
import * as WebSocket from "ws";
import { Server, BaseServerType } from './Server';
import { ApiCall } from './RPCCall';
import { CoderUtil } from '../models/CoderUtil';
import { ServerOutputData } from '../proto/TransportData';
import { Logger } from './Logger';

/**
 * 当前活跃的连接
 */
export class ActiveConnection<ServerType extends BaseServerType = any> {

    readonly options: ActiveConnectionOptions<ServerType>;
    readonly server: Server<ServerType>;
    readonly client: WebSocket;
    readonly request: http.IncomingMessage;
    readonly connId: number;
    readonly ip: string;
    readonly session: ServerType['session'];
    readonly logger: Logger;

    constructor(options: ActiveConnectionOptions<ServerType>) {
        this.options = options;
        this.server = options.server;
        this.client = options.client;
        this.request = options.request;
        this.ip = this._getClientIp(options.request);
        this.connId = options.connId;
        this.session = options.session;
        this.logger = new Logger(() => [`Conn${this.connId}(${this.ip})`])
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

    sendApiSucc(call: ApiCall<any, any>, body: any) {
        if (call.output) {
            call.logger.log('This request is already responsed')
            return;
        }

        // Encode Res Body
        let bufBody = this.server.tsbuffer.encode(body, call.service.res);

        // Encode Transport Data
        let outputData: ServerOutputData = [call.service.id, bufBody, call.sn, true];
        let transportData = CoderUtil.transportCoder.encode(outputData, 'ServerOutputData');

        this.client.send(transportData);
        call.output = body;
        call.logger.log('Res', body)
    }

    sendApiError(call: ApiCall<any, any>, body: { errMsg: string, errInfo?: any }) {
        // TODO
    }
}

export interface ActiveConnectionOptions<ServerType extends BaseServerType = any> {
    connId: number,
    server: Server<ServerType>,
    client: WebSocket,
    request: http.IncomingMessage,
    session: ServerType['session'],
    onClose: (conn: ActiveConnection<ServerType>, code: number, reason: string) => void
}