import { memo } from 'react';
import type { ChatMessage } from '../types';
import clsx from 'clsx';
import DOMPurify from 'dompurify';

interface MessageListProps {
  messages: ChatMessage[];
}

const MessageListComponent = ({ messages }: MessageListProps) => {
  return (
    <div className="meta-chat-body" role="log" aria-live="polite">
      {messages.map((message) => {
        // Sanitize message content to prevent XSS attacks
        const sanitizedContent = DOMPurify.sanitize(message.content, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
          ALLOWED_ATTR: ['href', 'target', 'rel']
        });

        return (
          <article
            key={message.id}
            className={clsx('meta-chat-message', message.role)}
            data-role={message.role}
          >
            <p dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
            <time className="meta-chat-timestamp" dateTime={message.timestamp}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {message.pending ? ' · sending…' : ''}
            </time>
          </article>
        );
      })}
    </div>
  );
};

export const MessageList = memo(MessageListComponent);
