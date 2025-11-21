import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAndSanitizeSearchQuery, validateTenantId, validateNumericParameter } from '../search-validation';
import { keywordSearch, getPrismaClient } from '../client';

describe('SQL Injection Prevention Tests', () => {
  describe('validateAndSanitizeSearchQuery', () => {
    it('should accept valid search queries', () => {
      const validQueries = [
        'hello world',
        'user authentication',
        'how to reset password',
      ];

      validQueries.forEach(query => {
        const result = validateAndSanitizeSearchQuery(query);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBeDefined();
      });
    });

    it('should reject SQL DROP TABLE injection', () => {
      const malicious1 = "test'; DROP TABLE documents; --";
      const result1 = validateAndSanitizeSearchQuery(malicious1);
      expect(result1.isValid).toBe(false);
      
      const malicious2 = "'; DROP TABLE chunks; --";
      const result2 = validateAndSanitizeSearchQuery(malicious2);
      expect(result2.isValid).toBe(false);
    });

    it('should reject UNION SELECT injection', () => {
      const malicious = "test' UNION SELECT * FROM users --";
      const result = validateAndSanitizeSearchQuery(malicious);
      expect(result.isValid).toBe(false);
    });

    it('should reject OR-based injection', () => {
      const malicious = "test' OR '1'='1";
      const result = validateAndSanitizeSearchQuery(malicious);
      expect(result.isValid).toBe(false);
    });

    it('should reject SQL comments', () => {
      const comment1 = 'test --';
      const comment2 = 'test /* comment */';
      
      expect(validateAndSanitizeSearchQuery(comment1).isValid).toBe(false);
      expect(validateAndSanitizeSearchQuery(comment2).isValid).toBe(false);
    });

    it('should reject semicolons', () => {
      const malicious = 'test; DELETE FROM chunks;';
      const result = validateAndSanitizeSearchQuery(malicious);
      expect(result.isValid).toBe(false);
    });

    it('should reject hex literals', () => {
      const malicious = 'test 0x5461626c65';
      const result = validateAndSanitizeSearchQuery(malicious);
      expect(result.isValid).toBe(false);
    });

    it('should reject empty queries', () => {
      expect(validateAndSanitizeSearchQuery('').isValid).toBe(false);
      expect(validateAndSanitizeSearchQuery('   ').isValid).toBe(false);
    });

    it('should reject too long queries', () => {
      const longQuery = 'a'.repeat(201);
      const result = validateAndSanitizeSearchQuery(longQuery);
      expect(result.isValid).toBe(false);
    });

    it('should reject too short queries', () => {
      const result = validateAndSanitizeSearchQuery('a');
      expect(result.isValid).toBe(false);
    });

    it('should sanitize by removing quotes', () => {
      const query = 'test quoted and single';
      const result = validateAndSanitizeSearchQuery(query);
      expect(result.isValid).toBe(true);
    });

    it('should normalize whitespace', () => {
      const query = 'test    multiple     spaces';
      const result = validateAndSanitizeSearchQuery(query);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test multiple spaces');
    });
  });

  describe('validateTenantId', () => {
    it('should accept valid UUIDs', () => {
      const uuid = '123e4567-e89b-42d3-a456-426614174000';
      const result = validateTenantId(uuid);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(validateTenantId('not-a-uuid').isValid).toBe(false);
      expect(validateTenantId('').isValid).toBe(false);
    });

    it('should reject SQL injection in tenant ID', () => {
      const malicious = "' OR '1'='1";
      const result = validateTenantId(malicious);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateNumericParameter', () => {
    it('should accept valid numbers', () => {
      const result = validateNumericParameter(5, 'topK', 1, 100);
      expect(result.isValid).toBe(true);
    });

    it('should reject out of range', () => {
      const result = validateNumericParameter(200, 'topK', 1, 100);
      expect(result.isValid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validateNumericParameter('abc', 'topK', 1, 100).isValid).toBe(false);
    });
  });

  describe('keywordSearch integration', () => {
    it('should prevent SQL injection in search', async () => {
      const malicious = "test'; DROP TABLE chunks; --";
      const tenantId = '123e4567-e89b-42d3-a456-426614174000';
      
      await expect(keywordSearch(tenantId, malicious, 5)).rejects.toThrow();
    });

    it('should prevent SQL injection in tenant ID', async () => {
      const malicious = "'; DROP TABLE tenants; --";
      await expect(keywordSearch(malicious, 'test', 5)).rejects.toThrow();
    });
  });
});
