/**
 * 基础的数据传输单元
 */

/**
 * [ ServiceID, Buffer, PtlSN? ]
 */
export type InputData = [uint, Uint8Array, uint?];

/**
 * ApiRes: [ ServiceID, Buffer, PtlSN, isSucc ]
 * Msg: [ ServiceID, Buffer ]
 */
export type OutputData = [uint, Uint8Array, uint?, boolean?];