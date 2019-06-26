import * as WebSocket from 'ws';
import { CoderUtil } from '../models/CoderUtil';
import { ServerOutputData, ServerInputData } from '../proto/TransportData';
import { ServiceProto, ApiServiceDef, MsgServiceDef } from '../proto/ServiceProto';
import { TSBuffer } from 'tsbuffer';
import { Counter } from '../models/Counter';
import { TSRPCError } from '../models/TSRPCError';

export class Client<ServiceType extends { req: any, res: any, msg: any }> {

    private readonly _options: ClientOptions;
    readonly services: ServiceProto['services'];
    readonly tsbuffer: TSBuffer;
    private _apiName2Service: { [apiName: string]: ApiServiceDef } = {};
    private _msgName2Service: { [msgName: string]: MsgServiceDef } = {};

    private _ws?: WebSocket;

    constructor(options: Pick<ClientOptions, 'server' | 'proto'> & Partial<ClientOptions>) {
        this._options = Object.assign({}, defaultClientOptions, options);
        this.services = this._options.proto.services;
        this.tsbuffer = new TSBuffer(this._options.proto.types);

        for (let v of this.services) {
            if (v.type === 'api') {
                this._apiName2Service[v.name] = v;
            }
            else {
                this._msgName2Service[v.name] = v;
            }
        }
    }

    private _rsConnect?: () => void;
    private _rjConnect?: () => void;
    async connect() {
        // 连接已存在
        if (this._ws) {
            console.warn('Connection exists already')
            return;
        }

        this._options.onStatusChange && this._options.onStatusChange('connecting');
        this._ws = new (WebSocket as any)(this._options.server) as WebSocket;

        this._ws.onopen = () => {
            this._rsConnect && this._rsConnect();
            this._rsConnect = this._rjConnect = undefined;
            this._options.onStatusChange && this._options.onStatusChange('open');
        };

        this._ws.onclose = this._onClientClose;

        this._ws.onerror = e => {
            console.error('[WebSocket ERROR]', e);
        }

        this._ws.onmessage = e => { this._onClientMessage(e.data) };

        return new Promise((rs, rj) => {
            this._rsConnect = rs;
            this._rjConnect = rj;
        })
    }

    private _rsClose?: Promise<void>;
    disconnect() {
        // 连接不存在
        if (!this._ws) {
            return;
        }

        this._ws.close();
    }

    private _onClientMessage(data: WebSocket.Data) {
        // 文字消息，通常用于调试，直接打印
        if (typeof data === 'string') {
            console.debug('[RECV_TXT]', data);
        }
        else if (Buffer.isBuffer(data)) {
            // 解码ServerOutputData
            let decRes = CoderUtil.tryDecode(CoderUtil.transportCoder, data, 'ServerOutputData');
            if (!decRes.isSucc) {
                console.error('[INVALID_DATA]', 'Cannot decode data', `data.length=${data.length}`, decRes.error);
                return;
            }
            let transportData = decRes.output as ServerOutputData;

            // 确认是哪个Service
            let service = this.services[transportData[0]];
            if (!service) {
                console.error('[INVALID_DATA]', `Cannot find service ID: ${transportData[0]}`);
                return;
            }

            // Handle API
            if (service.type === 'api') {
                let sn = transportData[2] as number | undefined;
                let isSucc = transportData[3] as boolean | undefined;
                if (sn === undefined || isSucc === undefined) {
                    console.error('[INVALID_RES]', 'Invalid API Response', `SN=${sn} isSucc=${isSucc}`);
                    return;
                }

                let pending = this._pendingApi[sn];
                if (!pending) {
                    console.debug(`[INVALID_SN]`, `Invalid SN: ${sn}`);
                    return;
                }
                delete this._pendingApi[sn];

                // Parse body
                let decRes = CoderUtil.tryDecode(this.tsbuffer, transportData[1], service.res);
                if (!decRes.isSucc) {
                    console.error('[INVALID_RES]', decRes.error);
                    pending.rj(new TSRPCError('Invalid Response', 'INVALID_RES'))
                    return;
                }
                let resBody = decRes.output as any;

                pending.rs(resBody);
            }
            // Handle Msg
            else {
                // Parse body
                let decRes = CoderUtil.tryDecode(this.tsbuffer, transportData[1], service.schema);
                if (!decRes.isSucc) {
                    console.error('[INVALID_MSG]', decRes.error);
                    // TODO res error
                    return;
                }
                let msgBody = decRes.output as any;

                // TODO msgBody
                // TEST
                console.log('RECV MSG', msgBody)
            }
        }
        else {
            console.warn('Unexpected message type', data);
        }
    }

    private _onClientClose = () => {
        // 还在连接中，则连接失败
        if (this._rjConnect) {
            this._rjConnect();
            this._rsConnect = this._rjConnect = undefined;
        }

        // 连接断开 则这个ws不再需要
        if (this._ws) {
            this._ws.onopen = this._ws.onclose = this._ws.onmessage = this._ws.onerror = undefined as any;
            this._ws = undefined;
        }

        this._options.onStatusChange && this._options.onStatusChange('closed');
    }

    private _apiSnCounter = new Counter();
    private _pendingApi: {
        [sn: number]: { rs: (data: any) => void, rj: (err: any) => void } | undefined;
    } = {};
    async callApi<T extends keyof ServiceType['req']>(apiName: T, req: ServiceType['req'][T])
        : Promise<ServiceType['res'][T]> {
        if (!this._ws || this.status !== 'open') {
            throw new TSRPCError('Network Error', 'NETWORK_ERROR');
        }

        // GetService
        let service = this._apiName2Service[apiName as string];

        // Encode
        let buf = this.tsbuffer.encode(req, service.req);

        // Transport Encode
        let sn = this._apiSnCounter.getNext();
        let serverInputData: ServerInputData = [service.id, buf, sn];
        let transportData = CoderUtil.transportCoder.encode(serverInputData, 'ServerInputData');

        // Wait for Res
        let promise = new Promise<ServiceType['res'][T]>((rs, rj) => {
            this._pendingApi[sn] = {
                rs: rs,
                rj: rj
            }
        });
        promise.then(() => {
            delete this._pendingApi[sn];
        }).catch(() => {
            delete this._pendingApi[sn];
        });
        return promise;
    }

    get status(): ClientStatus {
        if (!this._ws || this._ws.readyState === WebSocket.CLOSED || this._ws.readyState === WebSocket.CLOSING) {
            return 'closed';
        }
        else if (this._ws.readyState === WebSocket.OPEN) {
            return 'open';
        }
        else {
            return 'connecting'
        }
    }

    listenMsg() { }
    unlistenMsg() { }

    sendMsg() { }
}

const defaultClientOptions: ClientOptions = {
    server: '',
    proto: undefined as any
}

export interface ClientOptions {
    server: string;
    proto: ServiceProto;
    onStatusChange?: (newStatus: ClientStatus) => void;
}

export type ClientStatus = 'open' | 'connecting' | 'closed';