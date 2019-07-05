import { MsgChat } from '../../../MsgChat';

export interface ReqTest1 {
    name: string
};

export type ResTest1 = {
    reply: string,
    chat?: MsgChat
};