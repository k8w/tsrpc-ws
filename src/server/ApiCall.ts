import { BaseCall } from './BaseCall';

export interface ApiCall<T> extends BaseCall {
    ptlId: string;
    data: T;

    // res
    succ: (data: any) => void;
    error: (errmsg: string, errdata?: any) => void;
}