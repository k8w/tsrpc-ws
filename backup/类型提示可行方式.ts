class Test<C extends {
    req: any,
    res: any,
    session?: any
}> {
    callApi<T extends keyof C['req']>(name: T, req: C['req'][T]): C['res'][T] {
        throw new Error('')
    }

    getSession(): C['session'] { return null as any };
}

type Req1 = { a: { a: string }, b: { b: string }, c: { c: string } };
type Res1 = { a: { ra: string }, b: { rb: string } };
type Conf1 = {
    req: Req1,
    res: Res1
}

let test = new Test<Conf1 & {session: {a:string,b:boolean[]}}>();
test.callApi('a', { a: 'asdg' }).ra
test.callApi('b', { b: 's' }).rb
test.callApi('c', { c: 'asdg' })

test.getSession()