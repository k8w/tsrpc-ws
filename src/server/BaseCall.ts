import { ServerConnection } from "./ServerConnection";
import { Server } from "./Server";

export interface BaseCall {
    conn: ServerConnection;
    server: Server;

    // log
    log: (...args: any) => void;
}