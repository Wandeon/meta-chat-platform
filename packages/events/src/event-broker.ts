import { Event } from '@meta-chat/shared';

export interface EventBroker {
  init(): Promise<void>;
  publish(event: Event): Promise<void>;
  close(): Promise<void>;
}
