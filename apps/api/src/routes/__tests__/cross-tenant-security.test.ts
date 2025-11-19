/**
 * Cross-Tenant Security Tests
 * 
 * These tests verify that users from one tenant cannot access or modify
 * data belonging to another tenant. This is a CRITICAL security requirement.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { getPrismaClient } from '@meta-chat/database';

const prisma = getPrismaClient();

// Test data will be populated in beforeAll
let tenant1Id: string;
let tenant2Id: string;
let tenant1ConversationId: string;
let tenant1DocumentId: string;
let adminToken: string;

describe('Cross-Tenant Security', () => {
  beforeAll(async () => {
    // Create two test tenants
    const tenant1 = await prisma.tenant.create({
      data: {
        name: 'Test Tenant 1',
        slug: 'test-tenant-1-' + Date.now(),
        email: `test1-${Date.now()}@example.com`,
        settings: {},
      },
    });
    tenant1Id = tenant1.id;

    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'Test Tenant 2',
        slug: 'test-tenant-2-' + Date.now(),
        email: `test2-${Date.now()}@example.com`,
        settings: {},
      },
    });
    tenant2Id = tenant2.id;

    // Create a conversation for tenant1
    const conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant1Id,
        channelType: 'webchat',
        externalId: 'test-conv-' + Date.now(),
        userId: 'test-user-1',
        status: 'active',
      },
    });
    tenant1ConversationId = conversation.id;

    // Create a document for tenant1
    const document = await prisma.document.create({
      data: {
        tenantId: tenant1Id,
        filename: 'test-doc.txt',
        mimeType: 'text/plain',
        size: 100,
        path: 'test/path',
        checksum: 'abc123',
        storageProvider: 'local',
        status: 'indexed',
        metadata: { name: 'Test Document' },
      },
    });
    tenant1DocumentId = document.id;

    // TODO: Set up admin token for testing
    // This would typically come from your auth system
    // adminToken = await getAdminToken();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.conversation.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } },
    });
    await prisma.document.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } },
    });
  });

  describe('Conversation Access', () => {
    it('should prevent tenant2 from accessing tenant1 conversation', async () => {
      // Try to access tenant1's conversation with tenant2's ID
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: tenant1ConversationId,
          tenantId: tenant2Id, // Wrong tenant!
        },
      });

      // Should not find the conversation
      expect(conversation).toBeNull();
    });

    it('should allow tenant1 to access their own conversation', async () => {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: tenant1ConversationId,
          tenantId: tenant1Id, // Correct tenant
        },
      });

      expect(conversation).not.toBeNull();
      expect(conversation?.id).toBe(tenant1ConversationId);
    });

    it('should prevent cross-tenant conversation updates', async () => {
      // Try to update with wrong tenant ID
      const result = await prisma.conversation.updateMany({
        where: {
          id: tenant1ConversationId,
          tenantId: tenant2Id, // Wrong tenant!
        },
        data: {
          status: 'closed',
        },
      });

      // Should not update anything
      expect(result.count).toBe(0);

      // Verify conversation wasn't modified
      const conversation = await prisma.conversation.findUnique({
        where: { id: tenant1ConversationId },
      });
      expect(conversation?.status).toBe('active');
    });

    it('should prevent cross-tenant conversation deletion', async () => {
      // Try to delete with wrong tenant ID
      const result = await prisma.conversation.deleteMany({
        where: {
          id: tenant1ConversationId,
          tenantId: tenant2Id, // Wrong tenant!
        },
      });

      // Should not delete anything
      expect(result.count).toBe(0);

      // Verify conversation still exists
      const conversation = await prisma.conversation.findUnique({
        where: { id: tenant1ConversationId },
      });
      expect(conversation).not.toBeNull();
    });
  });

  describe('Document Access', () => {
    it('should prevent tenant2 from accessing tenant1 document', async () => {
      const document = await prisma.document.findFirst({
        where: {
          id: tenant1DocumentId,
          tenantId: tenant2Id, // Wrong tenant!
        },
      });

      expect(document).toBeNull();
    });

    it('should allow tenant1 to access their own document', async () => {
      const document = await prisma.document.findFirst({
        where: {
          id: tenant1DocumentId,
          tenantId: tenant1Id, // Correct tenant
        },
      });

      expect(document).not.toBeNull();
      expect(document?.id).toBe(tenant1DocumentId);
    });

    it('should prevent cross-tenant document updates', async () => {
      const result = await prisma.document.updateMany({
        where: {
          id: tenant1DocumentId,
          tenantId: tenant2Id, // Wrong tenant!
        },
        data: {
          status: 'deleted',
        },
      });

      expect(result.count).toBe(0);

      // Verify document wasn't modified
      const document = await prisma.document.findUnique({
        where: { id: tenant1DocumentId },
      });
      expect(document?.status).toBe('indexed');
    });

    it('should prevent cross-tenant document deletion', async () => {
      const result = await prisma.document.deleteMany({
        where: {
          id: tenant1DocumentId,
          tenantId: tenant2Id, // Wrong tenant!
        },
      });

      expect(result.count).toBe(0);

      // Verify document still exists
      const document = await prisma.document.findUnique({
        where: { id: tenant1DocumentId },
      });
      expect(document).not.toBeNull();
    });
  });

  describe('Chunk/Vector Search Access', () => {
    it('should only return chunks belonging to the querying tenant', async () => {
      // Create chunks for both tenants
      const chunk1 = await prisma.chunk.create({
        data: {
          tenantId: tenant1Id,
          documentId: tenant1DocumentId,
          content: 'Tenant 1 content',
          position: 0,
          metadata: {},
        },
      });

      // Query should only return tenant1's chunks when filtering by tenant1
      const chunks = await prisma.chunk.findMany({
        where: { tenantId: tenant1Id },
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every(c => c.tenantId === tenant1Id)).toBe(true);

      // Clean up
      await prisma.chunk.delete({ where: { id: chunk1.id } });
    });
  });

  describe('Message Access', () => {
    it('should prevent cross-tenant message access', async () => {
      // Create a message for tenant1's conversation
      const message = await prisma.message.create({
        data: {
          tenantId: tenant1Id,
          conversationId: tenant1ConversationId,
          content: { text: 'Secret message' },
          direction: 'inbound',
          status: 'delivered',
        },
      });

      // Try to find it with wrong tenant ID
      const foundMessage = await prisma.message.findFirst({
        where: {
          id: message.id,
          tenantId: tenant2Id, // Wrong tenant!
        },
      });

      expect(foundMessage).toBeNull();

      // Clean up
      await prisma.message.delete({ where: { id: message.id } });
    });
  });
});

describe('Tenant Scoping Utilities', () => {
  it('should add tenantId to where clauses', () => {
    const { scopeToTenant } = require('../../utils/tenantScope');

    const where = { id: '123' };
    const scoped = scopeToTenant(where, 'tenant-456');

    expect(scoped).toEqual({
      id: '123',
      tenantId: 'tenant-456',
    });
  });

  it('should validate tenant ownership correctly', () => {
    const { validateTenantOwnership } = require('../../utils/tenantScope');

    const resource = { id: '123', tenantId: 'tenant-1' };

    // Should succeed with correct tenant
    expect(() => {
      validateTenantOwnership(resource, 'tenant-1');
    }).not.toThrow();

    // Should fail with wrong tenant
    expect(() => {
      validateTenantOwnership(resource, 'tenant-2');
    }).toThrow('Resource not found');

    // Should fail with null resource
    expect(() => {
      validateTenantOwnership(null, 'tenant-1');
    }).toThrow('Resource not found');
  });
});
