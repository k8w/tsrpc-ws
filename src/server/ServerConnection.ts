export class ServerConnection {
    // Listen Msg
    listenMsg() { };
    listenMsgOnce() { };
    unlistenMsg() { };

    // Send Msg
    sendMsg() { };
}

export interface ConnectionInfo {
    sessionId: string;
    ip: string;
    user?: {};
}