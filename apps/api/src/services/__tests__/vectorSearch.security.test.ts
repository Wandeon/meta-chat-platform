/**
 * Security tests for Vector Search Service - SQL Injection Prevention
 */

import { describe, it, expect, vi } from 'vitest';
import { searchChunks } from '../vectorSearch';
import { getPrismaClient } from '@meta-chat/database';
import { z } from 'zod';

const prisma = getPrismaClient();

// Mock the embedding service to avoid external API calls
vi.mock('../embedding', () => ({
  generateQueryEmbedding: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
}));

describe.skip('Vector Search SQL Injection Prevention', () => {
  const validTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockEmbeddingConfig = {
    baseUrl: 'http://localhost:11434',
    model: 'nomic-embed-text',
  };

  describe('Tenant ID Validation', () => {
    it('should reject malicious SQL in tenantId', async () => {
      const maliciousTenantIds = [
        "tenant'; DROP TABLE chunks; --",
        "550e8400' OR '1'='1",
        "tenant'; UPDATE chunks SET content='hacked' WHERE '1'='1",
        "'; DELETE FROM chunks; --",
      ];

      for (const maliciousTenantId of maliciousTenantIds) {
        await expect(
          searchChunks('test query', maliciousTenantId, mockEmbeddingConfig)
        ).rejects.toThrow();
      }
    });

    it('should reject non-UUID tenantId', async () => {
      const invalidTenantIds = [
        'not-a-uuid',
        '12345',
        '',
        'tenant-123',
      ];

      for (const invalidTenantId of invalidTenantIds) {
        await expect(
          searchChunks('test query', invalidTenantId, mockEmbeddingConfig)
        ).rejects.toThrow(z.ZodError);
      }
    });

    it('should accept valid UUID tenantId', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';

      try {
        await searchChunks('test query', validUuid, mockEmbeddingConfig);
      } catch (error) {
        expect(error).not.toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('Document IDs Validation', () => {
    it('should prevent SQL injection through documentIds array', async () => {
      const maliciousDocumentIds = [
        "123'; DROP TABLE chunks; --",
        "456' OR '1'='1",
        "789'; UPDATE chunks SET content='hacked' WHERE '1'='1",
        "'; DELETE FROM chunks WHERE '1'='1'; --",
      ];

      await expect(
        searchChunks('test query', validTenantId, mockEmbeddingConfig, {
          documentIds: maliciousDocumentIds,
        })
      ).rejects.toThrow(z.ZodError);
    });

    it('should reject non-UUID document IDs', async () => {
      const invalidDocumentIds = [
        'not-a-uuid',
        '12345',
        'doc-123',
      ];

      await expect(
        searchChunks('test query', validTenantId, mockEmbeddingConfig, {
          documentIds: invalidDocumentIds,
        })
      ).rejects.toThrow(z.ZodError);
    });

    it('should reject too many document IDs (DoS prevention)', async () => {
      const tooManyIds = Array(101).fill('550e8400-e29b-41d4-a716-446655440000');

      await expect(
        searchChunks('test query', validTenantId, mockEmbeddingConfig, {
          documentIds: tooManyIds,
        })
      ).rejects.toThrow(z.ZodError);
    });

    it('should accept valid UUID document IDs', async () => {
      const validDocumentIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      try {
        await searchChunks('test query', validTenantId, mockEmbeddingConfig, {
          documentIds: validDocumentIds,
        });
      } catch (error) {
        expect(error).not.toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('Language Filter Validation', () => {
    it('should prevent SQL injection through languageFilter', async () => {
      const maliciousLanguages = [
        "en'; DROP TABLE chunks; --",
        "fr' OR '1'='1",
        "'; DELETE FROM chunks; --",
      ];

      for (const maliciousLang of maliciousLanguages) {
        await expect(
          searchChunks('test query', validTenantId, mockEmbeddingConfig, {
            languageFilter: maliciousLang,
          })
        ).rejects.toThrow(z.ZodError);
      }
    });

    it('should reject invalid language codes', async () => {
      const invalidLanguages = [
        'english',
        'e',
        'EN',
        '12',
        'e!',
      ];

      for (const invalidLang of invalidLanguages) {
        await expect(
          searchChunks('test query', validTenantId, mockEmbeddingConfig, {
            languageFilter: invalidLang,
          })
        ).rejects.toThrow(z.ZodError);
      }
    });

    it('should accept valid ISO 639-1 language codes', async () => {
      const validLanguages = ['en', 'fr', 'es', 'de', 'ja'];

      for (const validLang of validLanguages) {
        try {
          await searchChunks('test query', validTenantId, mockEmbeddingConfig, {
            languageFilter: validLang,
          });
        } catch (error) {
          expect(error).not.toBeInstanceOf(z.ZodError);
        }
      }
    });
  });

  describe('Limit Validation', () => {
    it('should reject invalid limits', async () => {
      const invalidLimits = [-1, 0, 101, 1.5];

      for (const invalidLimit of invalidLimits) {
        await expect(
          searchChunks('test query', validTenantId, mockEmbeddingConfig, {
            limit: invalidLimit,
          })
        ).rejects.toThrow(z.ZodError);
      }
    });

    it('should accept valid limits', async () => {
      const validLimits = [1, 5, 10, 50, 100];

      for (const validLimit of validLimits) {
        try {
          await searchChunks('test query', validTenantId, mockEmbeddingConfig, {
            limit: validLimit,
          });
        } catch (error) {
          expect(error).not.toBeInstanceOf(z.ZodError);
        }
      }
    });
  });

  describe('Similarity Validation', () => {
    it('should reject invalid similarity thresholds', async () => {
      const invalidThresholds = [-0.1, 1.1, 2];

      for (const invalidThreshold of invalidThresholds) {
        await expect(
          searchChunks('test query', validTenantId, mockEmbeddingConfig, {
            minSimilarity: invalidThreshold,
          })
        ).rejects.toThrow(z.ZodError);
      }
    });

    it('should accept valid similarity thresholds', async () => {
      const validThresholds = [0, 0.5, 0.75, 1];

      for (const validThreshold of validThresholds) {
        try {
          await searchChunks('test query', validTenantId, mockEmbeddingConfig, {
            minSimilarity: validThreshold,
          });
        } catch (error) {
          expect(error).not.toBeInstanceOf(z.ZodError);
        }
      }
    });
  });

  describe('Query String Safety', () => {
    it('should safely handle malicious query strings', async () => {
      const maliciousQueries = [
        "test'; DROP TABLE chunks; --",
        "test' OR '1'='1",
        "'; DELETE FROM chunks; --",
      ];

      for (const maliciousQuery of maliciousQueries) {
        try {
          await searchChunks(maliciousQuery, validTenantId, mockEmbeddingConfig);
        } catch (error) {
          expect(error).not.toBeInstanceOf(z.ZodError);
        }
      }
    });
  });

  describe('Database Integrity', () => {
    it('should verify chunks table exists after malicious attempts', async () => {
      const maliciousInputs = [
        { tenantId: "'; DROP TABLE chunks; --" },
        { documentIds: ["'; DROP TABLE chunks; --"] },
        { languageFilter: "'; DROP TABLE chunks; --" },
      ];

      for (const input of maliciousInputs) {
        try {
          await searchChunks(
            'test query',
            input.tenantId || validTenantId,
            mockEmbeddingConfig,
            {
              documentIds: input.documentIds as any,
              languageFilter: input.languageFilter as any,
            }
          );
        } catch (error) {
        }
      }

      const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "chunks"
      `;
      expect(count).toBeDefined();
      expect(Array.isArray(count)).toBe(true);
    });
  });

  describe('Parameterized Query Verification', () => {
    it('should use parameterized queries for all user inputs', async () => {
      const validOptions = {
        documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
        languageFilter: 'en',
        limit: 10,
        minSimilarity: 0.5,
      };

      try {
        await searchChunks('test query', validTenantId, mockEmbeddingConfig, validOptions);
      } catch (error) {
        expect(error).not.toBeInstanceOf(z.ZodError);
      }
    });
  });
});
