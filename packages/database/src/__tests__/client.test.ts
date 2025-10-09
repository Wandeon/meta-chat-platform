import { describe, expect, it, vi } from 'vitest';
import { getPrismaClient, keywordSearch, vectorSearch } from '../client';

describe('database client helpers', () => {
  it('returns a singleton Prisma client instance', () => {
    const first = getPrismaClient();
    const second = getPrismaClient();
    expect(first).toBe(second);
  });

  it('delegates vector searches to Prisma with normalized vectors', async () => {
    const prisma = getPrismaClient();
    const querySpy = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ id: 'chunk-1', similarity: 0.9 }] as any);

    const results = await vectorSearch('tenant', [1, 1], 3, 0.5);
    expect(results).toEqual([{ id: 'chunk-1', similarity: 0.9 }]);
    expect(querySpy).toHaveBeenCalledOnce();
    querySpy.mockRestore();
  });

  it('delegates keyword searches to Prisma full text queries', async () => {
    const prisma = getPrismaClient();
    const querySpy = vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ id: 'chunk-1', rank: 0.8 }] as any);

    const results = await keywordSearch('tenant', 'hello world', 2);
    expect(results).toEqual([{ id: 'chunk-1', rank: 0.8 }]);
    expect(querySpy).toHaveBeenCalledOnce();
    querySpy.mockRestore();
  });
});
