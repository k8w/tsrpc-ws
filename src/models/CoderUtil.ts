import { TSBuffer } from "tsbuffer";
import { stat } from "fs";

export class CoderUtil {

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
                            "type": "Number",
                            "scalarType": "uint"
                        },
                        {
                            "type": "Boolean"
                        }
                    ],
                    "optionalStartIndex": 2
                },
                "ApiResError": {
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

    static tryEncode(encoder: TSBuffer, value: any, schemaId: string): { isSucc: true, output: Uint8Array } | { isSucc: false, error: Error } {
        try {
            let output = encoder.encode(value, schemaId);
            return {
                isSucc: true,
                output: output
            }
        }
        catch (e) {
            return {
                isSucc: false,
                error: e
            }
        }
    }

    static tryDecode(decoder: TSBuffer, buf: Uint8Array, schemaId: string): { isSucc: true, output: unknown } | { isSucc: false, error: Error } {
        try {
            let output = decoder.decode(buf, schemaId);
            return {
                isSucc: true,
                output: output
            }
        }
        catch (e) {
            return {
                isSucc: false,
                error: e
            }
        }
    }

}