import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../types';
import clsx from 'clsx';
import { useVirtualizer } from '@tanstack/react-virtual';

interface MessageListProps {
  messages: ChatMessage[];
}

// Auto-scroll threshold: scrolling within 16px of bottom triggers auto-scroll for new messages
const SCROLL_EPSILON = 16;

const MessageListComponent = ({ messages }: MessageListProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 6,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    const container = parentRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      setIsAutoScrollEnabled(distanceFromBottom <= SCROLL_EPSILON);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isAutoScrollEnabled || messages.length === 0) {
      return;
    }

    const lastIndex = messages.length - 1;

    // Wait for layout to settle before scrolling to the newest message
    const id = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(lastIndex, { align: 'end' });
    });

    return () => cancelAnimationFrame(id);
  }, [isAutoScrollEnabled, messages.length, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const formatTimestamp = useMemo(
    () =>
      Intl.DateTimeFormat([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  return (
    <div className="meta-chat-body" role="log" aria-live="polite" aria-rowcount={messages.length} ref={parentRef}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((virtualRow) => {
          const message = messages[virtualRow.index];
          if (!message) return null;

          return (
            <article
              key={message.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              aria-rowindex={virtualRow.index + 1}
              className={clsx('meta-chat-message', message.role)}
              data-role={message.role}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <p>{message.content}</p>
              <time className="meta-chat-timestamp" dateTime={message.timestamp}>
                {formatTimestamp.format(new Date(message.timestamp))}
                {message.pending ? ' · sending…' : ''}
              </time>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export const MessageList = memo(MessageListComponent);
