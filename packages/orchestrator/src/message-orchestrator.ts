import { NormalizedMessage, createLogger } from '@meta-chat/shared';
import { QueueConsumer, QueueConsumerOptions } from './queue-consumer';

export interface MessageOrchestratorOptions
  extends Omit<QueueConsumerOptions<NormalizedMessage>, 'onMessage' | 'parse'> {
  handler: (message: NormalizedMessage) => Promise<void>;
}

const orchestratorLogger = createLogger('MessageOrchestrator');

export class MessageOrchestrator {
  private consumer: QueueConsumer<NormalizedMessage>;

  constructor(options: MessageOrchestratorOptions) {
    const { handler, ...consumerOptions } = options;

    this.consumer = new QueueConsumer<NormalizedMessage>({
      ...consumerOptions,
      parse: (payload) => JSON.parse(payload.toString()) as NormalizedMessage,
      onMessage: async (message, context) => {
        try {
          await handler(message);
          context.ack();
        } catch (error) {
          orchestratorLogger.error('Failed to process message', {
            tenantId: consumerOptions.tenantId,
            channel: consumerOptions.channel,
            messageId: message.id,
            error,
          });
          throw error;
        }
      },
    });
  }

  async start(): Promise<void> {
    await this.consumer.start();
  }

  async stop(): Promise<void> {
    await this.consumer.stop();
  }
}
