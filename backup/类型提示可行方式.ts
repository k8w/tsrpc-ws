class Test<C extends Conf<any, any>> {
    callApi<T extends keyof C['req']>(name: T, req: C['req'][T]): C['res'][T] {
        throw new Error('')
    }
}

type Conf<Req, Res> = {
    req: Req,
    res: Res
}

type Req1 = { a: { a: string }, b: { b: string }, c: { c: string } };
type Res1 = { a: { ra: string }, b: { rb: string } };
type Conf1 = {
    req: Req1,
    res: Res1
}

let test = new Test<Conf1>();
test.callApi('a', { a: 'asdg' }).ra
test.callApi('b', { b: 's' }).rb
test.callApi('c', { c: 'asdg' })