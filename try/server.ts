import { TSRPCServer } from "..";
import { serviceProto, ServiceType } from './proto/serviceProto';
import { TSRPCError } from '../src/models/TSRPCError';
import * as path from "path";

let server = new TSRPCServer<ServiceType & { session: any }>({
    proto: serviceProto,
    apiPath: path.resolve(__dirname, 'api')
});

// server.implementApi('Test', call => {
//     if (Math.random() > 0.75) {
//         call.succ({
//             reply: 'Hello, ' + call.data.name
//         })
//     }
//     else if (Math.random() > 0.5) {
//         call.error('What the fuck??', { msg: '哈哈哈哈' })
//     }
//     else if (Math.random() > 0.25) {
//         throw new Error('这应该是InternalERROR')
//     }
//     else {
//         throw new TSRPCError('返回到前台的错误', 'ErrInfo');
//     }
// });

server.listenMsg('Chat', call => {
    if (Math.random() > 0.5) {
        call.conn.sendMsg('Chat', {
            channel: call.data.channel,
            userName: '系统',
            content: '收到！',
            time: Date.now()
        })
    }
    else {

    }
})

server.start();

setInterval(() => {
    server.sendMsg(['1'], 'Chat', {
        channel: 123,
        userName: 'System',
        content: 'Lalala',
        time: Date.now()
    }).catch(e => { })
}, 1000)