import { PrismaClient } from '@prisma/client';
export declare function getPrismaClient(): PrismaClient;
export declare function vectorSearch(tenantId: string, embedding: number[], topK?: number, minSimilarity?: number): Promise<any[]>;
export declare function keywordSearch(tenantId: string, query: string, topK?: number): Promise<any[]>;
export { PrismaClient };
//# sourceMappingURL=client.d.ts.map