import { memo } from 'react';
import type { ChatMessage } from '../types';
import clsx from 'clsx';

interface MessageListProps {
  messages: ChatMessage[];
}

const MessageListComponent = ({ messages }: MessageListProps) => {
  return (
    <div className="meta-chat-body" role="log" aria-live="polite">
      {messages.map((message) => (
        <article
          key={message.id}
          className={clsx('meta-chat-message', message.role)}
          data-role={message.role}
        >
          <p>{message.content}</p>
          <time className="meta-chat-timestamp" dateTime={message.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {message.pending ? ' · sending…' : ''}
          </time>
        </article>
      ))}
    </div>
  );
};

export const MessageList = memo(MessageListComponent);
