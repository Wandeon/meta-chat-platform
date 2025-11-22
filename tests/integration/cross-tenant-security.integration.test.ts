import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const appPromise = import('../../apps/api/src/server').then((module) => module.createApp().then((ctx) => ctx.app));

describe('Cross-tenant security (integration)', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let tenant1ApiKey: string;
  let tenant2ApiKey: string;
  let tenant1ConversationId: string;
  let tenant1DocumentId: string;

  beforeEach(async () => {
    const { prisma } = getIntegrationTestContext();

    // Create tenants
    const tenant1 = await prisma.tenant.create({
      data: {
        name: 'Tenant One',
        slug: `tenant-one-${Date.now()}`,
        active: true,
      },
    });
    tenant1Id = tenant1.id;

    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'Tenant Two',
        slug: `tenant-two-${Date.now()}`,
        active: true,
      },
    });
    tenant2Id = tenant2.id;

    // Create tenant API keys
    const t1KeyMeta = generateApiKey('ten');
    const t1Hashed = await hashSecret(t1KeyMeta.apiKey);
    await prisma.tenantApiKey.create({
      data: {
        tenantId: tenant1Id,
        label: 'tenant1-key',
        prefix: t1KeyMeta.prefix,
        hash: t1Hashed.hash,
        salt: t1Hashed.salt,
        lastFour: t1KeyMeta.lastFour,
        active: true,
      },
    });
    tenant1ApiKey = t1KeyMeta.apiKey;

    const t2KeyMeta = generateApiKey('ten');
    const t2Hashed = await hashSecret(t2KeyMeta.apiKey);
    await prisma.tenantApiKey.create({
      data: {
        tenantId: tenant2Id,
        label: 'tenant2-key',
        prefix: t2KeyMeta.prefix,
        hash: t2Hashed.hash,
        salt: t2Hashed.salt,
        lastFour: t2KeyMeta.lastFour,
        active: true,
      },
    });
    tenant2ApiKey = t2KeyMeta.apiKey;

    // Seed conversation and document for tenant1
    const conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant1Id,
        channelType: 'webchat',
        externalId: 'conv-1',
        userId: 'user-1',
        status: 'active',
      },
    });
    tenant1ConversationId = conversation.id;

    const document = await prisma.document.create({
      data: {
        tenantId: tenant1Id,
        filename: 'doc.txt',
        mimeType: 'text/plain',
        size: 10,
        path: 'docs/doc.txt',
        checksum: 'abc',
        storageProvider: 'local',
        status: 'ready',
        metadata: { name: 'Doc' },
      },
    });
    tenant1DocumentId = document.id;
  });

  it('blocks cross-tenant access and allows owner', async () => {
    const app = await appPromise;

    // Tenant2 cannot list tenant1 data
    const listOther = await request(app)
      .get('/api/conversations')
      .set('x-api-key', tenant2ApiKey)
      .query({ tenantId: tenant1Id });
    expect(listOther.status).toBe(403);

    // Tenant1 sees their conversation
    const listOwn = await request(app)
      .get('/api/conversations')
      .set('x-api-key', tenant1ApiKey);
    expect(listOwn.status).toBe(200);
    expect(listOwn.body.success).toBe(true);
    expect(listOwn.body.data.some((c: any) => c.id === tenant1ConversationId)).toBe(true);

    // Tenant2 cannot fetch tenant1 conversation
    const getOther = await request(app)
      .get(`/api/conversations/${tenant1ConversationId}`)
      .set('x-api-key', tenant2ApiKey)
      .query({ tenantId: tenant1Id });
    expect(getOther.status).toBe(403);

    // Tenant2 cannot fetch tenant1 document
    const docOther = await request(app)
      .get(`/api/documents/${tenant1DocumentId}`)
      .set('x-api-key', tenant2ApiKey)
      .query({ tenantId: tenant1Id });
    expect(docOther.status).toBe(403);

    // Tenant1 fetches their document
    const docOwn = await request(app)
      .get(`/api/documents/${tenant1DocumentId}`)
      .set('x-api-key', tenant1ApiKey)
      .query({ tenantId: tenant1Id });
    expect(docOwn.status).toBe(200);
    expect(docOwn.body.data.id).toBe(tenant1DocumentId);
  });
});
