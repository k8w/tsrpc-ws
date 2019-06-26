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

    setInterval(async () => {
        try {
            let res = await client.callApi('Test', { name: 'asdf' });
            console.log('收到回复', res);
        }
        catch (e) {

        }
    }, 2000)
}

main();