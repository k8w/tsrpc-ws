export class HandlerManager {
    private _handlers: { [key: string]: Function[] | undefined } = {}

    /**
     * @return handlers count
     */
    forEachHandler(key: string, ...args: any[]) {
        let handlers = this._handlers[key];
        return handlers ? handlers.map(v => v(...args)) : [];
    }

    addHandler(key: string, handler: Function) {
        let handlers = this._handlers[key];
        // 初始化Handlers
        if (!handlers) {
            handlers = this._handlers[key] = [];
        }
        // 防止重复监听
        else if (handlers.some(v => v === handler)) {
            return;
        }

        handlers.push(handler);
    }

    removeHandler(key: string, handler?: Function) {
        let handlers = this._handlers[key];
        if (!handlers) {
            return;
        }

        // 未指定handler，删除所有handler
        if (!handler) {
            delete this._handlers[key];
            return;
        }

        handlers.removeOne(v => v === handler);
    }
}