"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAmqpChannel = void 0;
class MockAmqpChannel {
    calls = [];
    async assertExchange(name, type, options) {
        this.calls.push({ method: 'assertExchange', args: [name, type, options] });
        return { exchange: name };
    }
    async assertQueue(name, options) {
        this.calls.push({ method: 'assertQueue', args: [name, options] });
        return { queue: name };
    }
    async bindQueue(queue, exchange, routingKey) {
        this.calls.push({ method: 'bindQueue', args: [queue, exchange, routingKey] });
    }
}
exports.MockAmqpChannel = MockAmqpChannel;
//# sourceMappingURL=amqp-mock.js.map