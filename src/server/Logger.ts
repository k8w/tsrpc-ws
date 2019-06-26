import { callbackify } from "util";

export class Logger {

    prefix: () => string | string[];
    parent?: Logger;

    constructor(prefix: () => string | string[], parent?: Logger) {
        this.prefix = prefix;
        this.parent = parent;
    }

    getPrefix(): string[] {
        let prefix = this.prefix();
        let output = Array.isArray(prefix) ? prefix : [prefix];
        let parent = this.parent;
        while (parent) {
            output = parent.getPrefix().concat(output);
            parent = parent.parent;
        }

        return output;
    }

    log(...args: any[]) {
        console.log(...this.getPrefix().concat(args));
    }

    debug(...args: any[]) {
        console.debug(...this.getPrefix().concat(args));
    }

    warn(...args: any[]) {
        console.warn(...this.getPrefix().concat(args));
    }

    error(...args: any[]) {
        console.error(...this.getPrefix().concat(args));
    }

}