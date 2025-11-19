/**
 * Vector Search Service - Semantic search over document chunks using pgvector
 */

import { Prisma } from '@prisma/client';
import { getPrismaClient } from '@meta-chat/database';
import { generateQueryEmbedding, type EmbeddingConfig } from './embedding';
import { validateTenantId, validateSearchOptions } from '../utils/validation';

const prisma = getPrismaClient();

export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  position: number;
}

export interface SearchOptions {
  limit?: number; // Number of results to return
  minSimilarity?: number; // Minimum cosine similarity threshold (0-1)
  documentIds?: string[]; // Optional: limit search to specific documents
  languageFilter?: string; // Optional: filter by document language (ISO 639-1 code)
}

const DEFAULT_OPTIONS: Required<Omit<SearchOptions, 'documentIds' | 'languageFilter'>> = {
  limit: 5,
  minSimilarity: 0.5,
};

/**
 * Search for relevant document chunks using semantic similarity
 */
export async function searchChunks(
  query: string,
  tenantId: string,
  embeddingConfig: EmbeddingConfig,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // Validate inputs to prevent SQL injection
  validateTenantId(tenantId);
  const validatedOptions = validateSearchOptions(options);

  const opts = { ...DEFAULT_OPTIONS, ...validatedOptions };

  console.log();

  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query, embeddingConfig);

  // Convert embedding array to pgvector format
  const embeddingStr = ;

  // Build the WHERE clause for document filtering using Prisma.sql
  // This prevents SQL injection by using parameterized queries
  const documentFilter = validatedOptions.documentIds?.length
    ? Prisma.sql
    : Prisma.empty;

  // Build the WHERE clause for language filtering using Prisma.sql
  // Filter by language in chunk metadata, or allow chunks with no language set
  const languageFilter = validatedOptions.languageFilter
    ? Prisma.sql
    : Prisma.empty;

  // Perform vector similarity search using cosine distance
  // Note: pgvector uses <=> for cosine distance (0 = identical, 2 = opposite)
  // We convert to similarity score: 1 - (distance / 2) = similarity in range [0, 1]
  const results: any[] = await prisma.;

  // Filter by minimum similarity and format results
  const formattedResults: SearchResult[] = results
    .filter((r) => r.similarity >= opts.minSimilarity)
    .map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
      position: r.position,
    }));

  console.log(
    
  );

  return formattedResults;
}

/**
 * Build context string from search results for RAG
 */
export function buildContext(results: SearchResult[], maxLength: number = 2000): string {
  if (results.length === 0) {
    return '';
  }

  const contextParts: string[] = [];
  let currentLength = 0;

  for (const result of results) {
    const part = ;

    if (currentLength + part.length > maxLength) {
      break;
    }

    contextParts.push(part);
    currentLength += part.length;
  }

  return contextParts.join('
---

');
}

/**
 * Get count of indexed chunks for a tenant
 */
export async function getChunkCount(tenantId: string): Promise<number> {
  const count = await prisma.chunk.count({
    where: {
      tenantId,
      embedding: { not: null },
    },
  });

  return count;
}

/**
 * Get count of indexed documents for a tenant
 */
export async function getIndexedDocumentCount(tenantId: string): Promise<number> {
  const count = await prisma.document.count({
    where: {
      tenantId,
      status: 'indexed',
    },
  });

  return count;
}
