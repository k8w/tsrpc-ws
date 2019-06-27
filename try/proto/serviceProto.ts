import { MsgChat } from './MsgChat';
import { ReqTest, ResTest } from './PtlTest';
import { ServiceProto } from '../../src/proto/ServiceProto';

export interface ServiceType {
    req: {
        'Test': ReqTest,
        'a/b/c': { a: string }
    },
    res: {
        'Test': ResTest,
        'a/b/c': { ra: string }
    }
    msg: {
        'Chat': MsgChat,
        'xxx': string
    }
}

export const serviceProto: ServiceProto = {
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
        }
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
        }
    }
}