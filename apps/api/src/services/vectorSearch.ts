import { getPrismaClient, vectorSearch as dbVectorSearch, keywordSearch as dbKeywordSearch } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';


const logger = createLogger('VectorSearch');

export interface VectorSearchOptions {
  limit?: number;
  minSimilarity?: number;
  documentIds?: string[];
  useHybridSearch?: boolean;
  keywordQuery?: string;
}

export async function searchSimilarChunks(
  tenantId: string,
  embedding: number[],
  options: VectorSearchOptions = {}
): Promise<any[]> {
  const limit = options.limit || 10;
  const minSimilarity = options.minSimilarity || 0.7;
  const useHybridSearch = options.useHybridSearch !== false; // Default to true

  try {
    const prisma = getPrismaClient();

    // Perform vector search using the pgvector implementation
    const vectorResults = await dbVectorSearch(
      tenantId,
      embedding,
      limit,
      minSimilarity
    );

    // If hybrid search is enabled and keyword query is provided, combine results
    let results = vectorResults;
    if (useHybridSearch && options.keywordQuery) {
      const keywordResults = await dbKeywordSearch(
        tenantId,
        options.keywordQuery,
        Math.ceil(limit / 2) // Get half the results from keyword search
      );

      // Merge and deduplicate results
      const seenIds = new Set(vectorResults.map((r: any) => r.id));
      const uniqueKeywordResults = keywordResults.filter((r: any) => !seenIds.has(r.id));

      // Combine vector results (higher priority) with unique keyword results
      results = [...vectorResults, ...uniqueKeywordResults].slice(0, limit);
    }

    // Filter by documentIds if specified
    if (options.documentIds && options.documentIds.length > 0) {
      results = results.filter((r: any) =>
        options.documentIds!.includes(r.documentId)
      );
    }

    // Enrich results with document information
    const enrichedResults = await Promise.all(
      results.map(async (chunk: any) => {
        const document = await prisma.document.findUnique({
          where: { id: chunk.documentId },
          select: {
            id: true,
            title: true,
            source: true,
            status: true
          }
        });

        return {
          ...chunk,
          document,
          similarity: chunk.similarity || chunk.rank || 0
        };
      })
    );

    logger.info('Vector search completed', {
      tenantId,
      resultsCount: enrichedResults.length,
      hybridSearch: useHybridSearch && !!options.keywordQuery
    });

    return enrichedResults;
  } catch (error) {
    logger.error('Vector search failed:', error);
    throw error;
  }
}

export async function indexDocument(
  tenantId: string,
  documentId: string,
  chunks: Array<{ content: string; embedding?: number[]; metadata?: any }>
): Promise<void> {
  try {
    const prisma = getPrismaClient();

    // Create chunks in database with embeddings
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      await prisma.chunk.create({
        data: {
          tenantId,
          documentId,
          content: chunk.content,
          embedding: chunk.embedding ? `[${chunk.embedding.join(',')}]` : undefined,
          metadata: chunk.metadata || {},
          position: index
        }
      });
    }

    logger.info('Document indexed successfully', { documentId, chunkCount: chunks.length });
  } catch (error) {
    logger.error('Document indexing failed:', error);
    throw error;
  }
}
