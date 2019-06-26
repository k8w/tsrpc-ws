import { TSRPCServer } from "..";
import { serviceProto, ServiceType } from './proto/serviceProto';

let server = new TSRPCServer<ServiceType & { session: any }>({
    proto: serviceProto
});

server.implementApi('Test', call => {
    call.succ({
        reply: 'Hello, ' + call.data.name
    })
})

server.start();