import type { FunctionDefinition, FunctionContext } from '@meta-chat/shared';
import { EmbeddingsService } from './embeddings';
import { retrieveKnowledgeBase } from './retriever';
import { getSharedModule, getDatabaseModule } from './internal/dependencies';

export interface KnowledgeBaseFunctionDependencies {
  embeddings: EmbeddingsService;
  keywordSearch?: (tenantId: string, query: string, topK?: number) => Promise<any[]>;
  vectorSearch?: (
    tenantId: string,
    embedding: number[],
    topK?: number,
    minSimilarity?: number
  ) => Promise<any[]>;
}

const { createLogger } = getSharedModule();
const logger = createLogger('KnowledgeBaseFunction');
const database = getDatabaseModule();

export function createSearchKnowledgeBaseFunction(
  deps: KnowledgeBaseFunctionDependencies
): FunctionDefinition {
  const keywordFn = deps.keywordSearch ?? database?.keywordSearch;
  const vectorFn = deps.vectorSearch ?? database?.vectorSearch;

  if (!keywordFn || !vectorFn) {
    throw new Error('Database search functions are not available. Provide keywordSearch and vectorSearch implementations.');
  }

  return {
    name: 'search_knowledge_base',
    description: 'Search the tenant knowledge base for relevant context to answer a question.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query describing the information to retrieve.',
        },
        topK: {
          type: 'number',
          description: 'Maximum number of chunks to retrieve (default 5).',
        },
        minSimilarity: {
          type: 'number',
          description: 'Minimum cosine similarity threshold for vector search (0-1).',
        },
      },
      required: ['query'],
    },
    handler: async (params: any, context: FunctionContext) => {
      if (!params || typeof params.query !== 'string') {
        throw new Error('search_knowledge_base requires a query string');
      }

      const topK = typeof params.topK === 'number' ? params.topK : undefined;
      const minSimilarity = typeof params.minSimilarity === 'number' ? params.minSimilarity : undefined;

      logger.info('Executing knowledge base search', {
        tenantId: context.tenantId,
        topK,
        minSimilarity,
      });

      const results = await retrieveKnowledgeBase(
        {
          tenantId: context.tenantId,
          query: params.query,
          topK,
          minSimilarity,
        },
        {
          embeddings: deps.embeddings,
          keywordSearch: keywordFn,
          vectorSearch: vectorFn,
        }
      );

      return JSON.stringify(
        results.map((result) => ({
          documentId: result.chunk.documentId,
          chunkId: result.chunk.id,
          content: result.chunk.content,
          metadata: result.chunk.metadata,
          score: result.score,
          source: result.type,
        }))
      );
    },
  };
}
