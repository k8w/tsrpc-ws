/**
 * 基础的数据传输单元
 */

/**
 * [ ServiceID, Buffer, SN? ]
 */
export type ServerInputData = [uint, Uint8Array, uint?];

/**
 * ApiRes: [ ServiceID, Buffer, SN, isSucc ]
 * Msg: [ ServiceID, Buffer ]
 */
export type ServerOutputData = [uint, Uint8Array, uint?, boolean?];

export interface ApiResError {
    message: string,
    info?: any
}