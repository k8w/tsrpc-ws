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

    await client.connect();
    console.log('连接成功');

}