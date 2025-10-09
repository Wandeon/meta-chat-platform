import type { Server } from 'socket.io';
import type { ChannelContext } from './types';
import { ChannelAdapter } from './adapter';
import { WhatsAppAdapter } from './whatsapp/whatsapp-adapter';
import { MessengerAdapter } from './messenger/messenger-adapter';
import { WebChatAdapter } from './webchat/webchat-adapter';

export * from './types';
export { ChannelAdapter } from './adapter';
export { WhatsAppAdapter } from './whatsapp/whatsapp-adapter';
export { MessengerAdapter } from './messenger/messenger-adapter';
export { WebChatAdapter } from './webchat/webchat-adapter';

export interface ChannelAdapterFactoryOptions {
  io?: Server;
}

export function createChannelAdapter(context: ChannelContext, options: ChannelAdapterFactoryOptions = {}): ChannelAdapter {
  switch (context.channel.type) {
    case 'whatsapp':
      return new WhatsAppAdapter(context);
    case 'messenger':
      return new MessengerAdapter(context);
    case 'webchat': {
      if (!options.io) {
        throw new Error('WebChat adapter requires a Socket.IO server instance');
      }

      return new WebChatAdapter(context, { io: options.io });
    }
    default:
      throw new Error(`Unsupported channel type: ${context.channel.type}`);
  }
}
