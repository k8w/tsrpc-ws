import { BaseServer, BaseServiceType, BaseServerOptions, defualtBaseServerOptions } from '../BaseServer';
import * as http from "http";
import { HttpConnection } from './HttpConnection';
import { HttpUtil } from '../../models/HttpUtil';
import { HttpCall, ApiCallHttp, MsgCallHttp } from './HttpCall';
import { TransportDataUtil, ParsedServerInput } from '../../models/TransportDataUtil';
import { parse } from 'path';
import { Counter } from '../../models/Counter';
import { PrefixLogger } from '../Logger';
import { ApiCall } from '../ws/WsCall';

export class HttpServer<ServiceType extends BaseServiceType = any> extends BaseServer<HttpServerOptions, ServiceType>{

    private _server?: http.Server;

    constructor(options: HttpServerOptions) {
        super(Object.assign({}, defaultHttpServerOptions, options));
    }

    private _status: HttpServerStatus = 'closed';
    public get status(): HttpServerStatus {
        return this._status;
    }

    private _apiReqSnCounter = new Counter;
    start(): Promise<void> {
        if (this._server) {
            throw new Error('Server already started');
        }

        return new Promise(rs => {
            this._status = 'opening';
            this._server = http.createServer((req, res) => {
                let conn: HttpConnection<ServiceType> | undefined;

                res.statusCode = 200;
                if (this._options.cors) {
                    res.setHeader('Access-Control-Allow-Origin', this._options.cors)
                };

                req.on('data', data => {
                    if (!conn) {
                        let ip = HttpUtil.getClientIp(req);
                        conn = HttpConnection.pool.get({
                            server: this,
                            logger: PrefixLogger.pool.get({
                                logger: this.logger,
                                prefix: ip
                            }),
                            ip: ip,
                            req: req,
                            res: res
                        });
                    }
                    this.onData(conn, data);
                })
            });

            this._server.listen(this._options.port, () => {
                this._status = 'open';
                rs();
            })
        });
    }

    stop(immediately?: boolean): Promise<void> {
        return new Promise(rs => {
            if (!this._server) {
                rs();
                return;
            }
            this._status = 'closing';

            if (immediately) {
                this._server.close(() => {
                    rs();
                })
            }
            else {
                // TODO 等所有请求都结束再关闭
            }

            this._server = undefined;
        })
    }

    protected _makeCall(conn: HttpConnection<ServiceType>, buf: Uint8Array): HttpCall {
        let parsed: ParsedServerInput;
        try {
            parsed = TransportDataUtil.parseServerInput(this.tsbuffer, this.serviceMap, buf);
        }
        catch (e) {
            conn.close();
            throw new Error(`Invalid input buffer, length=${buf.length}`);
        }

        if (parsed.type === 'api') {
            let call: ApiCallHttp;
            let succ: ApiCallHttp['succ'] = res => { conn.sendApiSucc(call, res) };
            let error: ApiCallHttp['error'] = (msg, info) => { conn.sendApiError(call, msg, info) };
            let sn = this._apiReqSnCounter.getNext();
            call = {
                conn: conn,
                sn: sn,
                type: 'api',
                logger: PrefixLogger.pool.get({
                    logger: conn.logger,
                    prefix: `API#${sn} ${parsed.service.name}`
                }),
                service: parsed.service,
                req: parsed.req,
                res: undefined,

                // Methods
                succ: succ,
                error: error
            }
            return call
        }
        else {
            let call: MsgCallHttp = {
                conn: conn,
                type: 'msg',
                logger: PrefixLogger.pool.get({
                    logger: conn.logger,
                    prefix: `MSG ${parsed.service.name}`
                }),
                service: parsed.service,
                msg: parsed.msg
            }
            return call;
        }
    }

    protected _afterApi(call: ApiCallHttp) {
        // Clean Call & Conn
        HttpConnection.pool.put(call.conn);
    }

    protected _afterMsg(call: MsgCallHttp) {
        // Clean Call & Conn
        HttpConnection.pool.put(call.conn);
    }


}

export const defaultHttpServerOptions: HttpServerOptions = {
    ...defualtBaseServerOptions,
    port: 3000
}

export interface HttpServerOptions extends BaseServerOptions {
    port: number,
    cors?: string
}

type HttpServerStatus = 'opening' | 'open' | 'closing' | 'closed';