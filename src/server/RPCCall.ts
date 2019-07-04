import { ActiveConnection } from './ActiveConnection';
import { ApiServiceDef, MsgServiceDef } from '../proto/ServiceProto';
import { Logger } from './Logger';
import { BaseServerCustomType, Server } from './Server';
export interface BaseCall<ServerCustomType extends BaseServerCustomType> {
    conn: ActiveConnection<ServerCustomType>;
    logger: Logger;
    getSession: () => Promise<ServerCustomType['session']>;
}

export interface ApiCall<Req = any, Res = any, ServerCustomType extends BaseServerCustomType = any> extends BaseCall<ServerCustomType> {
    service: ApiServiceDef,
    sn: number,
    data: Req,

    output?: any,

    // res
    succ: (data: Res) => void;
    error: (message: string, info?: any) => void;
}

export interface MsgCall<Msg = any, ServerCustomType extends BaseServerCustomType = any> extends BaseCall<ServerCustomType> {
    service: MsgServiceDef,
    data: Msg
}

export type RPCCall = ApiCall | MsgCall;