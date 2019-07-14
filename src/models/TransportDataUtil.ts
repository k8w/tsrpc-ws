import { TSBuffer } from "tsbuffer";
import { ApiServiceDef, MsgServiceDef, ServiceDef } from '../proto/ServiceProto';
import { ServerInputData } from '../proto/TransportData';
import { ServiceMap } from '../server/BaseServer';

export type ParsedServerInput = { type: 'api', service: ApiServiceDef, req: any, sn?: number } | { type: 'msg', service: MsgServiceDef, msg: any };

export class TransportDataUtil {

    private static _transportCoder?: TSBuffer;
    static get transportCoder(): TSBuffer {
        if (!this._transportCoder) {
            this._transportCoder = new TSBuffer({
                "ServerInputData": {
                    "type": "Tuple",
                    "elementTypes": [
                        {
                            "type": "Number",
                            "scalarType": "uint"
                        },
                        {
                            "type": "Buffer",
                            "arrayType": "Uint8Array"
                        },
                        {
                            "type": "Number",
                            "scalarType": "uint"
                        }
                    ],
                    "optionalStartIndex": 2
                },
                "ServerOutputData": {
                    "type": "Tuple",
                    "elementTypes": [
                        {
                            "type": "Number",
                            "scalarType": "uint"
                        },
                        {
                            "type": "Buffer",
                            "arrayType": "Uint8Array"
                        },
                        {
                            "type": "Reference",
                            "target": "ApiError"
                        },
                        {
                            "type": "Number",
                            "scalarType": "uint"
                        }
                    ],
                    "optionalStartIndex": 1
                },
                "ApiError": {
                    "type": "Interface",
                    "properties": [
                        {
                            "id": 0,
                            "name": "message",
                            "type": {
                                "type": "String"
                            }
                        },
                        {
                            "id": 1,
                            "name": "info",
                            "type": {
                                "type": "Any"
                            },
                            "optional": true
                        }
                    ]
                }
            })
        }

        return this._transportCoder;
    }

    static encodeApiSucc(tsbuffer: TSBuffer, service: ApiServiceDef, res: any, sn?: number) {
        let resBuf = tsbuffer.encode(res, service.res);
        return this.transportCoder.encode([service.id, res, undefined, sn], 'ServerOutputData');
    }

    static encodeApiError(service: ApiServiceDef, message: string, info?: any, sn?: number) {
        return this.transportCoder.encode([service.id, undefined, { message: message, info: info }, sn], 'ServerOutputData');
    }

    static encodeMsg(tsbuffer: TSBuffer, service: MsgServiceDef, msg: any) {
        let msgBuf = tsbuffer.encode(msg, service.msg);
        return this.transportCoder.encode([service.id, msgBuf], 'ServerOutputData');
    }

    static parseServerInput(tsbuffer: TSBuffer, serviceMap: ServiceMap, buf: Uint8Array): ParsedServerInput {
        let serverInputData = this.transportCoder.decode(buf, 'ServerInputData') as ServerInputData;

        // 确认是哪个Service
        let service = serviceMap.id2Service[serverInputData[0]];
        if (!service) {
            throw new Error(`Cannot find service ID: ${serverInputData[0]}`)
        }

        // 解码Body
        if (service.type === 'api') {
            let req = tsbuffer.decode(serverInputData[1], service.req);
            return {
                type: 'api',
                service: service,
                req: req,
                sn: serverInputData[2]
            }
        }
        else {
            let msg = tsbuffer.decode(serverInputData[1], service.msg);
            return {
                type: 'msg',
                service: service,
                msg: msg
            }
        }
    }

}