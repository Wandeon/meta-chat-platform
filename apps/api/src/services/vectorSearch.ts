import { PrismaClient } from '@meta-chat/database';
import { logger } from '@meta-chat/shared';
import { Prisma } from '@prisma/client';

export interface VectorSearchOptions {
  limit?: number;
  minSimilarity?: number;
  documentIds?: string[];
}

export async function searchSimilarChunks(
  tenantId: string,
  embedding: number[],
  options: VectorSearchOptions = {}
): Promise<any[]> {
  const limit = options.limit || 10;
  const minSimilarity = options.minSimilarity || 0.7;

  try {
    // Build the query using Prisma's safe query builder
    let whereClause: any = {
      tenantId: tenantId
    };

    if (options.documentIds && options.documentIds.length > 0) {
      whereClause.documentId = {
        in: options.documentIds
      };
    }

    // For now, return chunks without vector similarity calculation
    // This is a temporary implementation until proper vector search is added
    const chunks = await new PrismaClient().chunk.findMany({
      where: whereClause,
      take: limit,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            source: true
          }
        }
      }
    });

    return chunks;
  } catch (error) {
    logger.error('Vector search failed:', error);
    throw error;
  }
}

export async function indexDocument(
  tenantId: string,
  documentId: string,
  chunks: Array<{ content: string; metadata?: any }>
): Promise<void> {
  try {
    // Create chunks in database
    const chunkRecords = chunks.map((chunk, index) => ({
      tenantId,
      documentId,
      content: chunk.content,
      metadata: chunk.metadata || {},
      position: index
    }));

    await new PrismaClient().chunk.createMany({
      data: chunkRecords
    });

    logger.info('Document indexed successfully', { documentId, chunkCount: chunks.length });
  } catch (error) {
    logger.error('Document indexing failed:', error);
    throw error;
  }
}
