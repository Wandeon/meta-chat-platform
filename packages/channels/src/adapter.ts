import type { NormalizedMessage } from '@meta-chat/shared';
import type {
  ChannelContext,
  ChannelMessageHandler,
  ChannelReceivePayload,
  ChannelReceiveResult,
  ChannelSendPayload,
  ChannelSendResponse,
  ChannelVerifyPayload,
  ChannelVerifyResponse
} from './types';

export abstract class ChannelAdapter {
  protected messageHandler?: ChannelMessageHandler;

  constructor(protected readonly context: ChannelContext) {}

  setMessageHandler(handler: ChannelMessageHandler): void {
    this.messageHandler = handler;
  }

  protected async deliver(messages: NormalizedMessage[]): Promise<void> {
    if (!this.messageHandler) {
      return;
    }

    for (const message of messages) {
      await this.messageHandler(message);
    }
  }

  abstract verify(payload: ChannelVerifyPayload): Promise<ChannelVerifyResponse>;

  abstract receive(payload: ChannelReceivePayload): Promise<ChannelReceiveResult>;

  abstract send(payload: ChannelSendPayload): Promise<ChannelSendResponse>;
}
