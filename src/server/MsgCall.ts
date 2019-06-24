import { BaseCall } from './BaseCall';

export interface MsgCall<T> extends BaseCall {
    msgId: string;
    data: T;    
}