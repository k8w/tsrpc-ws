export class Client {

    connect() { }

    disconnect() { }

    callApi() { }

    listen() { }

    unlisten() { }

    on(event: 'error') { }
}

interface PushPtlTest {
    pid: 'xxxx',
    a: string,
    b: string[]
}

class PushPtl<T> { }

let ptl1 = new PushPtl<PushPtlTest>();

function listen<T>(ptl: PushPtl<T>, handler: (msg: T) => void) {

}

listen(ptl1, v => {
    v
})