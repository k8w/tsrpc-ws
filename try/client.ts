import { TSRPCClient } from "..";
import { serviceProto, ServiceType } from './proto/serviceProto';

async function main() {
    let client = new TSRPCClient<ServiceType>({
        server: 'ws://127.0.0.1:3000',
        proto: serviceProto,
        onStatusChange: v => {
            console.log('StatusChange', v);
        }
    });

    try {
        await client.connect();
        console.log('连接成功');
    }
    catch (e) {
        console.log('连接失败')
        return;
    }

    // setInterval(async () => {
    //     let res = await client.callApi('Test', { name: '小明同学' });
    //     console.log('收到回复', res);
    // }, 1000);

    client.listenMsg('Chat', msg => {
        console.log('收到MSG', msg);
    });

    setInterval(() => {
        client.sendMsg('Chat', {
            channel: 123,
            userName: '王小明',
            content: '你好',
            time: Date.now()
        })
    }, 1000)

    // #region Benchmark
    // let maxTime = 0;
    // let done = 0;
    // let startTime = Date.now();

    // setTimeout(() => {
    //     console.log('done', maxTime, done);
    //     process.exit();
    // }, 3000);

    // for (let i = 0; i < 10000; ++i) {
    //     client.callApi('Test', { name: '小明同学' }).then(() => {
    //         ++done;
    //         maxTime = Math.max(maxTime, Date.now() - startTime)
    //     })
    // }
    // #endregion    
}

main();