import { ActiveConnection } from './ActiveConnection';
import { ApiServiceDef, MsgServiceDef } from '../proto/ServiceProto';
import { Logger } from './Logger';
export interface BaseCall {
    conn: ActiveConnection;
    logger: Logger;
}

export interface ApiCall<Req = any, Res = any> extends BaseCall {
    service: ApiServiceDef,
    sn: number,
    data: Req,

    output?: any,

    // res
    succ: (data: Res) => void;
    error: (message: string, info?: any) => void;
}

export interface MsgCall<Msg = any> extends BaseCall {
    service: MsgServiceDef,
    data: Msg
}

export type RPCCall = ApiCall | MsgCall;