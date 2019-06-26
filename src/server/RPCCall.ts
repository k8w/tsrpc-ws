import { ActiveConnection } from './ActiveConnection';
import { ApiServiceDef, MsgServiceDef } from '../proto/ServiceProto';
export interface BaseCall {
    conn: ActiveConnection;

    // log
    log: (...args: any) => void;
}

export interface ApiCall<T> extends BaseCall {
    service: ApiServiceDef,
    sn: number,
    data: T,

    output?: any

    // res
    succ: (data: any) => void;
    error: (message: string, info?: any) => void;
}

export interface MsgCall<T> extends BaseCall {
    service: MsgServiceDef,
    data: T
}

export type RPCCall = ApiCall<any> | MsgCall<any>;