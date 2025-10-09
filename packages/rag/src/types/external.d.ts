declare module '@meta-chat/shared' {
  export interface Logger {
    info: (message: string, context?: Record<string, any>) => void;
    warn: (message: string, context?: Record<string, any>) => void;
    error: (message: string | Error, context?: Record<string, any>) => void;
  }

  export function createLogger(name: string): Logger;

  export interface DocumentChunk {
    id: string;
    documentId: string;
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
  }

  export type RetrievalResultType = 'keyword' | 'vector' | 'hybrid';

  export interface RetrievalResult {
    chunk: DocumentChunk;
    score: number;
    type: RetrievalResultType;
  }

  export interface FunctionDefinition {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
    handler: (params: any, context: FunctionContext) => Promise<string>;
  }

  export interface FunctionContext {
    tenantId: string;
    conversationId: string;
    message: any;
  }
}

declare module '@meta-chat/database' {
  export type PrismaClient = any;

  export namespace Prisma {
    export type JsonValue = any;
    export interface TransactionClient {
      document: any;
      chunk: any;
      $executeRawUnsafe: (...args: any[]) => Promise<any>;
    }
  }

  export interface Document {
    id: string;
    tenantId: string;
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    checksum: string;
    storageProvider: string;
    version: number;
    status: string;
    metadata: Record<string, any>;
  }

  export function getPrismaClient(): PrismaClient;
  export function keywordSearch(tenantId: string, query: string, topK?: number): Promise<any[]>;
  export function vectorSearch(
    tenantId: string,
    embedding: number[],
    topK?: number,
    minSimilarity?: number
  ): Promise<any[]>;
}
