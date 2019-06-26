import { ActiveConnection } from './ActiveConnection';
import { ApiServiceDef, MsgServiceDef } from '../proto/ServiceProto';
export interface BaseCall {
    conn: ActiveConnection;

    // log
    log: (...args: any) => void;
    logDebug: (...args: any) => void;
    logWarn: (...args: any) => void;
    logError: (...args: any) => void;
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

export interface MsgCall<T = any> extends BaseCall {
    service: MsgServiceDef,
    data: T
}

export type RPCCall = ApiCall | MsgCall;