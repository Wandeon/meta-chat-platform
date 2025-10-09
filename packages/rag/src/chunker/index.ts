interface Token {
  value: string;
  start: number;
  end: number;
}

export interface ChunkerOptions {
  strategy?: 'fixed' | 'semantic' | 'recursive';
  maxTokens?: number;
  overlap?: number;
}

export interface ChunkCandidate {
  content: string;
  metadata: Record<string, any>;
  position: number;
  tokenCount: number;
  startToken: number;
  endToken: number;
}

const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP = 64;

export function chunkText(text: string, options: ChunkerOptions = {}): ChunkCandidate[] {
  const strategy = options.strategy ?? 'recursive';
  switch (strategy) {
    case 'fixed':
      return chunkFixed(text, options);
    case 'semantic':
      return chunkSemantic(text, options);
    case 'recursive':
    default:
      return chunkRecursive(text, options);
  }
}

function chunkFixed(text: string, options: ChunkerOptions): ChunkCandidate[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return [];
  }

  const window = Math.max(1, options.maxTokens ?? DEFAULT_MAX_TOKENS);
  const overlap = Math.min(Math.max(0, options.overlap ?? DEFAULT_OVERLAP), window - 1);
  const results: ChunkCandidate[] = [];

  let start = 0;
  let position = 0;
  while (start < tokens.length) {
    const end = Math.min(tokens.length, start + window);
    const startToken = start;
    const endToken = end - 1;
    const chunkStart = tokens[start].start;
    let chunkEnd = tokens[end - 1].end;
    while (chunkEnd < text.length && /\s/.test(text.charAt(chunkEnd))) {
      chunkEnd += 1;
    }

    const content = text.slice(chunkStart, chunkEnd).trim();
    if (content) {
      results.push({
        content,
        metadata: {
          strategy: 'fixed',
          window,
          overlap,
        },
        position,
        tokenCount: end - start,
        startToken,
        endToken,
      });
      position += 1;
    }

    if (end === tokens.length) {
      break;
    }
    start = end - overlap;
  }

  return results;
}

function chunkSemantic(text: string, options: ChunkerOptions): ChunkCandidate[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlap = options.overlap ?? Math.floor(DEFAULT_OVERLAP / 2);
  const paragraphs = text.split(/\n{2,}/);

  const results: ChunkCandidate[] = [];
  let buffer = '';
  let bufferTokens = 0;
  let bufferStartToken = 0;
  let tokenCursor = 0;
  let position = 0;
  let paragraphIndex = 0;

  for (const rawParagraph of paragraphs) {
    const paragraph = rawParagraph.trim();
    const paragraphTokens = tokenize(paragraph);
    const paragraphTokenCount = paragraphTokens.length;

    if (paragraphTokenCount === 0) {
      paragraphIndex += 1;
      continue;
    }

    if (bufferTokens === 0) {
      bufferStartToken = tokenCursor;
    }

    if (bufferTokens + paragraphTokenCount > maxTokens && bufferTokens > 0) {
      const content = buffer.trim();
      if (content) {
        results.push({
          content,
          metadata: {
            strategy: 'semantic',
            paragraphStart: paragraphIndex - Math.ceil(bufferTokens / Math.max(paragraphTokenCount, 1)),
            paragraphEnd: paragraphIndex - 1,
          },
          position,
          tokenCount: bufferTokens,
          startToken: bufferStartToken,
          endToken: bufferStartToken + bufferTokens - 1,
        });
        position += 1;
      }
      buffer = '';
      bufferTokens = 0;
      bufferStartToken = tokenCursor;
    }

    if (paragraphTokenCount > maxTokens) {
      const fixed = chunkFixed(paragraph, { strategy: 'fixed', maxTokens, overlap });
      for (const chunk of fixed) {
        results.push({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            strategy: 'semantic',
            paragraphIndex,
          },
          position,
          startToken: tokenCursor + chunk.startToken,
          endToken: tokenCursor + chunk.endToken,
        });
        position += 1;
      }
      tokenCursor += paragraphTokenCount;
      buffer = '';
      bufferTokens = 0;
      bufferStartToken = tokenCursor;
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      bufferTokens += paragraphTokenCount;
      tokenCursor += paragraphTokenCount;
    }

    paragraphIndex += 1;
  }

  if (bufferTokens > 0) {
    const content = buffer.trim();
    if (content) {
      results.push({
        content,
        metadata: {
          strategy: 'semantic',
          paragraphStart: paragraphIndex - Math.ceil(bufferTokens / Math.max(bufferTokens, 1)),
          paragraphEnd: paragraphIndex - 1,
        },
        position,
        tokenCount: bufferTokens,
        startToken: bufferStartToken,
        endToken: bufferStartToken + bufferTokens - 1,
      });
    }
  }

  return results;
}

function chunkRecursive(text: string, options: ChunkerOptions): ChunkCandidate[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const semanticChunks = chunkSemantic(text, options);

  if (semanticChunks.length === 0) {
    return [];
  }

  const refined: ChunkCandidate[] = [];
  let position = 0;
  for (const chunk of semanticChunks) {
    if (chunk.tokenCount <= maxTokens) {
      refined.push({ ...chunk, position });
      position += 1;
      continue;
    }

    const sentences = splitIntoSentences(chunk.content);
    let buffer = '';
    let bufferTokens = 0;
    let sentenceStartToken = chunk.startToken;
    for (const sentence of sentences) {
      const sentenceTokens = tokenize(sentence);
      if (sentenceTokens.length === 0) {
        continue;
      }
      if (bufferTokens + sentenceTokens.length > maxTokens && bufferTokens > 0) {
        refined.push({
          content: buffer.trim(),
          metadata: {
            strategy: 'recursive',
            sourceStrategy: chunk.metadata.strategy,
          },
          position,
          tokenCount: bufferTokens,
          startToken: sentenceStartToken,
          endToken: sentenceStartToken + bufferTokens - 1,
        });
        position += 1;
        sentenceStartToken += bufferTokens;
        buffer = '';
        bufferTokens = 0;
      }

      buffer = buffer ? `${buffer} ${sentence}` : sentence;
      bufferTokens += sentenceTokens.length;
    }

    if (bufferTokens > 0) {
      refined.push({
        content: buffer.trim(),
        metadata: {
          strategy: 'recursive',
          sourceStrategy: chunk.metadata.strategy,
        },
        position,
        tokenCount: bufferTokens,
        startToken: sentenceStartToken,
        endToken: sentenceStartToken + bufferTokens - 1,
      });
      position += 1;
    }
  }

  if (refined.length === 0) {
    return chunkFixed(text, options);
  }

  return refined;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

function splitIntoSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.map((part) => part.trim()).filter(Boolean);
}
