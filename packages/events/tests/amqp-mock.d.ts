interface Call {
    method: string;
    args: any[];
}
export declare class MockAmqpChannel {
    calls: Call[];
    assertExchange(name: string, type: string, options: any): Promise<{
        exchange: string;
    }>;
    assertQueue(name: string, options: any): Promise<{
        queue: string;
    }>;
    bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
}
export {};
//# sourceMappingURL=amqp-mock.d.ts.map