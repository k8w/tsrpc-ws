import { TSRPCServer } from "..";
import { serviceProto, ServiceType } from './proto/serviceProto';

let server = new TSRPCServer<ServiceType & { session: any }>({
    proto: serviceProto
});

server.implementApi('Test', call => {
    call.succ({
        reply: 'Hello, ' + call.data.name
    })
});

server.listenMsg('Chat', call => {
    call.conn.sendMsg('Chat', {
        channel: call.data.channel,
        userName: '系统',
        content: '收到！',
        time: Date.now()
    })
})

server.start();