class TSRPCServer {
    constructor(...opt: any) { }
};

let server = new TSRPCServer({
    protoPath: 'proto.json',
    apiPath: 'src/api'
});

// API
// Before API handler
// After API handler

server.start();