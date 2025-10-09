import type { MessageContent, MessageType, NormalizedMessage } from '@meta-chat/shared';

type TimestampInput = string | number | Date;

export function toDate(timestamp: TimestampInput): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }

  if (typeof timestamp === 'number') {
    if (timestamp < 10_000_000_000) {
      return new Date(timestamp * 1000);
    }

    return new Date(timestamp);
  }

  if (timestamp.includes('-') || timestamp.includes(':')) {
    return new Date(timestamp);
  }

  const asNumber = Number(timestamp);
  return toDate(asNumber);
}

interface NormalizedMessageParams {
  id: string;
  conversationId: string;
  externalId?: string;
  direction: NormalizedMessage['direction'];
  from: string;
  timestamp: TimestampInput;
  type: MessageType;
  content: MessageContent;
  metadata?: Record<string, any>;
}

export function createNormalizedMessage(params: NormalizedMessageParams): NormalizedMessage {
  const { id, conversationId, externalId, direction, from, timestamp, type, content, metadata } = params;
  return {
    id,
    conversationId,
    externalId,
    direction,
    from,
    timestamp: toDate(timestamp),
    type,
    content,
    metadata
  };
}

export function normalizeTextContent(text?: string | null): MessageContent {
  return {
    text: text ?? undefined
  };
}

export function normalizeMediaContent(media: {
  url: string;
  mimeType: string;
  filename?: string;
  caption?: string;
}): MessageContent {
  return {
    media: {
      url: media.url,
      mimeType: media.mimeType,
      filename: media.filename,
      caption: media.caption
    }
  };
}

export function normalizeLocationContent(location: {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}): MessageContent {
  return {
    location
  };
}
