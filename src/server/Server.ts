import { ServerConnection } from './ServerConnection';
import { ServerProto } from './ServerProto';
import { ApiCall } from './ApiCall';
import { MsgCall } from './MsgCall';
export class Server {

    private _conns: ServerConnection[] = [];
    private _id2Conn: { [connId: string]: ServerConnection | undefined } = {};

    // API 只能实现一次
    implementApi() { };

    // Msg 可以重复监听
    listenMsg() { };
    unlistenMsg() { };

    // Send Msg
    sendMsg(connId: string | string[], msgId: string) { };

    // Flow return 代表是否继续执行后续流程
    apiFlow: ((call: ApiCall<any>) => (boolean | Promise<boolean>))[] = [];
    msgFlow: ((call: MsgCall<any>) => (boolean | Promise<boolean>))[] = [];

    start() { }
    async stop(immediately: boolean = false) { }
}

// event => event data
export interface ServerEventData {
    sendMsg: any,
    resSucc: any,
    resError: any
}

export type ServerOptions = {
    port: number;
    proto: string | ServerProto;
    apiPath?: string;
};