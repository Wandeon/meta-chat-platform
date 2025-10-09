import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const appPromise = import('../../apps/api/src/server').then((module) => module.createApp().then(ctx => ctx.app));

describe('Webhook CRUD REST API', () => {
  let tenantApiKey: string;
  let tenantId: string;

  beforeEach(async () => {
    const { prisma } = getIntegrationTestContext();

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Webhook Test Tenant',
        slug: 'webhook-test',
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

  it('should create a new webhook', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/webhooks')
      .set('x-api-key', tenantApiKey)
      .send({
        url: 'https://example.com/webhook',
        events: ['message.received', 'conversation.created'],
        secret: 'webhook-secret',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      url: 'https://example.com/webhook',
      events: ['message.received', 'conversation.created'],
      active: true,
    });
  });

  it('should create webhook with custom headers', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/webhooks')
      .set('x-api-key', tenantApiKey)
      .send({
        url: 'https://example.com/webhook-headers',
        events: ['message.received'],
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.headers).toMatchObject({
      'X-Custom-Header': 'custom-value',
    });
  });

  it('should reject invalid webhook URL', async () => {
    const app = await appPromise;

    await request(app)
      .post('/api/webhooks')
      .set('x-api-key', tenantApiKey)
      .send({
        url: 'not-a-valid-url',
        events: ['message.received'],
      })
      .expect(400);
  });

  it('should reject empty events array', async () => {
    const app = await appPromise;

    await request(app)
      .post('/api/webhooks')
      .set('x-api-key', tenantApiKey)
      .send({
        url: 'https://example.com/webhook',
        events: [],
      })
      .expect(400);
  });

  it('should list webhooks for tenant', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.outgoingWebhook.create({
      data: {
        tenantId,
        url: 'https://example.com/list-test',
        events: ['message.received'],
        active: true,
      },
    });

    const response = await request(app)
      .get('/api/webhooks')
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should filter by active status', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.outgoingWebhook.create({
      data: {
        tenantId,
        url: 'https://example.com/active-test',
        events: ['message.received'],
        active: true,
      },
    });

    const response = await request(app)
      .get('/api/webhooks?active=true')
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.every((w: any) => w.active === true)).toBe(true);
  });

  it('should get specific webhook', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const webhook = await prisma.outgoingWebhook.create({
      data: {
        tenantId,
        url: 'https://example.com/detail-test',
        events: ['message.received', 'message.sent'],
        active: true,
      },
    });

    const response = await request(app)
      .get(`/api/webhooks/${webhook.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(webhook.id);
  });

  it('should update webhook events', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const webhook = await prisma.outgoingWebhook.create({
      data: {
        tenantId,
        url: 'https://example.com/update-test',
        events: ['message.received'],
        active: true,
      },
    });

    const response = await request(app)
      .put(`/api/webhooks/${webhook.id}`)
      .set('x-api-key', tenantApiKey)
      .send({
        events: ['message.received', 'message.sent', 'conversation.created'],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.events).toEqual([
      'message.received',
      'message.sent',
      'conversation.created',
    ]);
  });

  it('should enable/disable webhook', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const webhook = await prisma.outgoingWebhook.create({
      data: {
        tenantId,
        url: 'https://example.com/disable-test',
        events: ['message.received'],
        active: true,
      },
    });

    const response = await request(app)
      .put(`/api/webhooks/${webhook.id}`)
      .set('x-api-key', tenantApiKey)
      .send({
        active: false,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.active).toBe(false);
  });

  it('should delete webhook', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const webhook = await prisma.outgoingWebhook.create({
      data: {
        tenantId,
        url: 'https://example.com/delete-test',
        events: ['message.received'],
        active: true,
      },
    });

    await request(app)
      .delete(`/api/webhooks/${webhook.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(200);

    const deleted = await prisma.outgoingWebhook.findUnique({
      where: { id: webhook.id },
    });
    expect(deleted).toBeNull();
  });

  it('should not access webhooks from other tenants', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const otherTenant = await prisma.tenant.create({
      data: {
        name: 'Other Tenant',
        slug: 'other-tenant',
        active: true,
      },
    });

    const otherWebhook = await prisma.outgoingWebhook.create({
      data: {
        tenantId: otherTenant.id,
        url: 'https://example.com/other',
        events: ['message.received'],
        active: true,
      },
    });

    await request(app)
      .get(`/api/webhooks/${otherWebhook.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(404);
  });
});
