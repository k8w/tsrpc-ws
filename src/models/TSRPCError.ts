export class TSRPCError extends Error {

    readonly info?: any;

    constructor(message: string, info?: any) {
        super(message);
        this.info = info;
    }

}