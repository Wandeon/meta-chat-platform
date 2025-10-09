interface Call {
  method: string;
  args: any[];
}

export class MockAmqpChannel {
  public calls: Call[] = [];

  async assertExchange(name: string, type: string, options: any) {
    this.calls.push({ method: 'assertExchange', args: [name, type, options] });
    return { exchange: name };
  }

  async assertQueue(name: string, options: any) {
    this.calls.push({ method: 'assertQueue', args: [name, options] });
    return { queue: name };
  }

  async bindQueue(queue: string, exchange: string, routingKey: string) {
    this.calls.push({ method: 'bindQueue', args: [queue, exchange, routingKey] });
  }
}
