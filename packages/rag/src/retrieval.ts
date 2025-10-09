import { PrismaClient, keywordSearch, vectorSearch } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('RagRetriever');

export interface RetrievalRequest {
  tenantId: string;
  embedding?: number[];
  query?: string;
  topK?: number;
  minSimilarity?: number;
}

export interface RetrievalResult {
  id: string;
  documentId: string;
  content: string;
  metadata: any;
  score: number;
}

export class RagRetriever {
  constructor(private readonly prisma: PrismaClient) {}

  async retrieve({ tenantId, embedding, query, topK = 3, minSimilarity = 0.7 }: RetrievalRequest): Promise<RetrievalResult[]> {
    if (!embedding?.length && !query) {
      return [];
    }

    if (embedding?.length) {
      try {
        const vectorResults = await vectorSearch(tenantId, embedding, topK, minSimilarity);
        if (vectorResults.length > 0) {
          return vectorResults.map((row: any) => ({
            id: row.id,
            documentId: row.documentId,
            content: row.content,
            metadata: row.metadata,
            score: row.similarity ?? 0,
          }));
        }
      } catch (error) {
        logger.warn('Vector search failed, falling back to keyword search', error as Error);
      }
    }

    if (query) {
      const keywordResults = await keywordSearch(tenantId, query, topK);
      return keywordResults.map((row: any) => ({
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        metadata: row.metadata,
        score: row.rank ?? 0,
      }));
    }

    return [];
  }

  async hydrateDocuments(chunkIds: string[]): Promise<Record<string, { documentId: string; filename: string; mimeType: string }>> {
    if (chunkIds.length === 0) {
      return {};
    }

    const chunks = await this.prisma.chunk.findMany({
      where: { id: { in: chunkIds } },
      include: {
        document: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
          },
        },
      },
    });

    return chunks.reduce<Record<string, { documentId: string; filename: string; mimeType: string }>>((acc, chunk) => {
      if (chunk.document) {
        acc[chunk.id] = {
          documentId: chunk.document.id,
          filename: chunk.document.filename,
          mimeType: chunk.document.mimeType,
        };
      }
      return acc;
    }, {});
  }
}
