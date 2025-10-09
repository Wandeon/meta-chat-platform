import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const appPromise = import('../../apps/api/src/server').then((module) => module.createApp().then(ctx => ctx.app));

describe('Document CRUD REST API', () => {
  let tenantApiKey: string;
  let tenantId: string;

  beforeEach(async () => {
    const { prisma } = getIntegrationTestContext();

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Document Test Tenant',
        slug: 'document-test',
        active: true,
      },
    });
    tenantId = tenant.id;

    // Create tenant API key
    const keyMetadata = generateApiKey('ten');
    const hashed = await hashSecret(keyMetadata.apiKey);

    await prisma.tenantApiKey.create({
      data: {
        tenantId: tenant.id,
        label: 'test-key',
        prefix: keyMetadata.prefix,
        hash: hashed.hash,
        salt: hashed.salt,
        lastFour: keyMetadata.lastFour,
      },
    });

    tenantApiKey = keyMetadata.apiKey;
  });

  it('should create a new document', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/documents')
      .set('x-api-key', tenantApiKey)
      .send({
        name: 'Test Document',
        source: 'test.pdf',
        metadata: {
          author: 'Test Author',
        },
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: 'Test Document',
      source: 'test.pdf',
      status: 'pending',
    });
  });

  it('should list documents for tenant', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.document.create({
      data: {
        tenantId,
        name: 'List Test Doc',
        source: 'list.pdf',
        status: 'indexed',
      },
    });

    const response = await request(app)
      .get('/api/documents')
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should filter documents by status', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.document.create({
      data: {
        tenantId,
        name: 'Indexed Doc',
        source: 'indexed.pdf',
        status: 'indexed',
      },
    });

    const response = await request(app)
      .get('/api/documents?status=indexed')
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.every((d: any) => d.status === 'indexed')).toBe(true);
  });

  it('should get a specific document', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const document = await prisma.document.create({
      data: {
        tenantId,
        name: 'Detail Test',
        source: 'detail.pdf',
        status: 'pending',
      },
    });

    const response = await request(app)
      .get(`/api/documents/${document.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(document.id);
  });

  it('should update a document', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const document = await prisma.document.create({
      data: {
        tenantId,
        name: 'Update Test',
        source: 'update.pdf',
        status: 'pending',
      },
    });

    const response = await request(app)
      .put(`/api/documents/${document.id}`)
      .set('x-api-key', tenantApiKey)
      .send({
        name: 'Updated Document',
        status: 'indexed',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Document');
    expect(response.body.data.status).toBe('indexed');
  });

  it('should delete a document', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const document = await prisma.document.create({
      data: {
        tenantId,
        name: 'Delete Test',
        source: 'delete.pdf',
        status: 'pending',
      },
    });

    await request(app)
      .delete(`/api/documents/${document.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(200);

    const deleted = await prisma.document.findUnique({
      where: { id: document.id },
    });
    expect(deleted).toBeNull();
  });

  it('should not access documents from other tenants', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const otherTenant = await prisma.tenant.create({
      data: {
        name: 'Other Tenant',
        slug: 'other-tenant',
        active: true,
      },
    });

    const otherDoc = await prisma.document.create({
      data: {
        tenantId: otherTenant.id,
        name: 'Other Doc',
        source: 'other.pdf',
        status: 'pending',
      },
    });

    await request(app)
      .get(`/api/documents/${otherDoc.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(404);
  });
});
