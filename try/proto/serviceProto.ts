import { MsgChat } from './MsgChat';
import { ReqTest, ResTest } from './PtlTest';
import { TSRPCServiceProto } from '../../index';
import { ReqTest1, ResTest1 } from './a/b/c/PtlTest1';

export interface ServiceType {
    req: {
        'Test': ReqTest,
        'a/b/c/Test1': ReqTest1
    },
    res: {
        'Test': ResTest,
        'a/b/c/Test1': ResTest1
    }
    msg: {
        'Chat': MsgChat,
        'xxx': string
    }
}

export const serviceProto: TSRPCServiceProto = {
    "services": [
        {
            id: 0,
            type: 'api',
            name: 'Test',
            req: 'PtlTest/ReqTest',
            res: 'PtlTest/ResTest'
        },
        {
            id: 1,
            type: 'msg',
            name: 'Chat',
            msg: 'MsgChat/MsgChat'
        },
        {
            id: 2,
            type: 'api',
            name: 'a/b/c/Test1',
            req: 'a/b/c/PtlTest1/ReqTest1',
            res: 'a/b/c/PtlTest1/ResTest1'
        },
        {
            id: 3,
            type: 'api',
            name: 'a/b/c/d/e',
            req: 'xxx',
            res: 'xxx'
        },
    ],
    "types": {
        "MsgChat/MsgChat": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "channel",
                    "type": {
                        "type": "Number"
                    }
                },
                {
                    "id": 1,
                    "name": "userName",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 2,
                    "name": "content",
                    "type": {
                        "type": "String"
                    }
                },
                {
                    "id": 3,
                    "name": "time",
                    "type": {
                        "type": "Number"
                    }
                }
            ]
        },
        "PtlTest/ReqTest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "PtlTest/ResTest": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "reply",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "a/b/c/PtlTest1/ReqTest1": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "name",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        },
        "a/b/c/PtlTest1/ResTest1": {
            "type": "Interface",
            "properties": [
                {
                    "id": 0,
                    "name": "reply",
                    "type": {
                        "type": "String"
                    }
                }
            ]
        }
    }
}