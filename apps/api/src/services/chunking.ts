/**
 * Document Chunking Service
 * Splits documents into smaller chunks for embedding and retrieval
 */

export interface ChunkResult {
  content: string;
  position: number;
  metadata: Record<string, any>;
}

export interface ChunkingOptions {
  chunkSize?: number; // Number of characters per chunk
  overlap?: number; // Number of characters to overlap between chunks
  minChunkSize?: number; // Minimum chunk size in characters
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  chunkSize: 500, // 500 characters ≈ 100-150 tokens
  overlap: 50, // 10% overlap for context continuity
  minChunkSize: 100, // Don't create tiny chunks
};

/**
 * Split text into chunks with overlap
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): ChunkResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Clean the text
  const cleanedText = text
    .trim()
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines

  if (cleanedText.length === 0) {
    return [];
  }

  const chunks: ChunkResult[] = [];
  let position = 0;
  let startIndex = 0;

  // Safety counter to prevent infinite loops
  let iterationCount = 0;
  const maxIterations = Math.ceil(cleanedText.length / opts.chunkSize) * 2 + 10;

  while (startIndex < cleanedText.length && iterationCount < maxIterations) {
    iterationCount++;

    // Calculate end index for this chunk
    let endIndex = Math.min(startIndex + opts.chunkSize, cleanedText.length);

    // If this is not the last chunk, try to break at a space
    if (endIndex < cleanedText.length) {
      const spacePos = cleanedText.lastIndexOf(' ', endIndex);
      if (spacePos > startIndex + opts.minChunkSize) {
        endIndex = spacePos + 1;
      }
    }

    const content = cleanedText.substring(startIndex, endIndex).trim();

    // Only add chunk if it meets minimum size requirement
    if (content.length >= opts.minChunkSize) {
      chunks.push({
        content,
        position,
        metadata: {
          charStart: startIndex,
          charEnd: endIndex,
          length: content.length,
        },
      });
      position++;
    }

    // Move to next chunk with overlap, but ensure we always move forward
    const nextStart = endIndex - opts.overlap;
    if (nextStart <= startIndex) {
      startIndex = endIndex; // Force progress if overlap would cause us to stay in place
    } else {
      startIndex = nextStart;
    }
  }

  if (iterationCount >= maxIterations) {
    console.warn(`[Chunking] Hit max iterations (${maxIterations}) - possible infinite loop prevented`);
  }

  return chunks;
}

/**
 * Find the best place to break a sentence
 */
function findSentenceBreak(text: string, start: number, preferredEnd: number): number {
  // Look for sentence endings near the preferred end
  const searchStart = Math.max(start, preferredEnd - 100);
  const searchEnd = Math.min(text.length, preferredEnd + 50);
  const searchText = text.substring(searchStart, searchEnd);

  // Sentence ending patterns - create new regex each time to avoid state issues
  const patterns = [
    '[.!?]\\s+[A-Z]', // Period/exclamation/question followed by space and capital
    '[.!?]["\']\\s+[A-Z]', // Same but with quotes
    '[.!?]\\s*\\n', // Sentence end followed by newline
    '[.!?]$', // Sentence end at the end
  ];

  let bestMatch = -1;
  let bestDistance = Infinity;

  for (const patternStr of patterns) {
    const pattern = new RegExp(patternStr, 'g'); // Create fresh regex for each pattern
    let match;
    while ((match = pattern.exec(searchText)) !== null) {
      const absolutePos = searchStart + match.index + 1; // +1 to include the punctuation
      const distance = Math.abs(absolutePos - preferredEnd);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = absolutePos;
      }
    }
  }

  // If we found a good break point, use it
  if (bestMatch > start) {
    return bestMatch;
  }

  // Otherwise, look for any space near the preferred end
  const spaceMatch = text.lastIndexOf(' ', preferredEnd);
  if (spaceMatch > start) {
    return spaceMatch + 1;
  }

  // Fall back to preferred end
  return preferredEnd;
}

/**
 * Chunk a document by detecting its type and applying appropriate chunking strategy
 */
export function chunkDocument(
  content: string,
  mimeType: string,
  options: ChunkingOptions = {}
): ChunkResult[] {
  // For now, treat all content as plain text
  // In the future, we could add special handling for:
  // - Markdown (preserve heading structure)
  // - HTML (strip tags, preserve semantic structure)
  // - Code (preserve function boundaries)

  if (mimeType.includes('markdown')) {
    return chunkMarkdown(content, options);
  }

  return chunkText(content, options);
}

/**
 * Chunk markdown while preserving heading structure
 */
function chunkMarkdown(content: string, options: ChunkingOptions = {}): ChunkResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Split by headings first
  const sections = content.split(/^(#{1,6}\s+.+)$/gm);
  const chunks: ChunkResult[] = [];
  let position = 0;

  let currentSection = '';
  let currentHeading = '';

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Check if this is a heading
    if (/^#{1,6}\s+/.test(section)) {
      // Process the previous section if it exists
      if (currentSection.trim()) {
        const sectionChunks = chunkText(currentSection, opts);
        sectionChunks.forEach((chunk) => {
          chunks.push({
            ...chunk,
            position: position++,
            metadata: {
              ...chunk.metadata,
              heading: currentHeading,
            },
          });
        });
      }

      currentHeading = section;
      currentSection = section + '\n';
    } else {
      currentSection += section;
    }
  }

  // Process the last section
  if (currentSection.trim()) {
    const sectionChunks = chunkText(currentSection, opts);
    sectionChunks.forEach((chunk) => {
      chunks.push({
        ...chunk,
        position: position++,
        metadata: {
          ...chunk.metadata,
          heading: currentHeading,
        },
      });
    });
  }

  return chunks;
}
