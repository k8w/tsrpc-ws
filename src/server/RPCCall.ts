import { ActiveConnection } from './ActiveConnection';
import { ApiServiceDef, MsgServiceDef } from '../proto/ServiceProto';
export interface BaseCall {
    conn: ActiveConnection;

    // log
    log: (...args: any) => void;
}

export interface ApiCall<Req, Res> extends BaseCall {
    service: ApiServiceDef,
    sn: number,
    data: Req,

    output?: any,

    // res
    succ: (data: Res) => void;
    error: (message: string, info?: any) => void;
}

export interface MsgCall<T> extends BaseCall {
    service: MsgServiceDef,
    data: T
}

export type RPCCall = ApiCall<any, any> | MsgCall<any>;