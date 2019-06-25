import { TSRPCServer } from "..";

let server = new TSRPCServer({
    proto: {
        services: [],
        types: {}
    }
})

server.start();