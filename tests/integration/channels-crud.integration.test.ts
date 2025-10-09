import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const appPromise = import('../../apps/api/src/server').then((module) => module.createApp().then(ctx => ctx.app));

describe('Channel CRUD REST API', () => {
  let tenantApiKey: string;
  let tenantId: string;

  beforeEach(async () => {
    const { prisma } = getIntegrationTestContext();

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Channel Test Tenant',
        slug: 'channel-test',
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

  it('should create a WhatsApp channel', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/channels')
      .set('x-api-key', tenantApiKey)
      .send({
        type: 'whatsapp',
        name: 'WhatsApp Channel',
        config: {
          phoneNumberId: '123456',
          accessToken: 'token',
          verifyToken: 'verify',
        },
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('whatsapp');
  });

  it('should create a Messenger channel', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/channels')
      .set('x-api-key', tenantApiKey)
      .send({
        type: 'messenger',
        name: 'Messenger Channel',
        config: {
          pageId: 'page-123',
          accessToken: 'token',
          appSecret: 'secret',
        },
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('messenger');
  });

  it('should create a WebChat channel', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/channels')
      .set('x-api-key', tenantApiKey)
      .send({
        type: 'webchat',
        name: 'WebChat Channel',
        config: {
          theme: { primaryColor: '#007bff' },
        },
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.type).toBe('webchat');
  });

  it('should list channels for tenant', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.channel.create({
      data: {
        tenantId,
        type: 'webchat',
        name: 'List Test Channel',
        config: {},
        active: true,
      },
    });

    const response = await request(app)
      .get('/api/channels')
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should update a channel', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const channel = await prisma.channel.create({
      data: {
        tenantId,
        type: 'webchat',
        name: 'Update Test',
        config: {},
        active: true,
      },
    });

    const response = await request(app)
      .put(`/api/channels/${channel.id}`)
      .set('x-api-key', tenantApiKey)
      .send({
        name: 'Updated Channel',
        active: false,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Channel');
  });

  it('should delete a channel', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const channel = await prisma.channel.create({
      data: {
        tenantId,
        type: 'webchat',
        name: 'Delete Test',
        config: {},
        active: true,
      },
    });

    await request(app)
      .delete(`/api/channels/${channel.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(200);

    const deleted = await prisma.channel.findUnique({
      where: { id: channel.id },
    });
    expect(deleted).toBeNull();
  });

  it('should reject requests without tenant auth', async () => {
    const app = await appPromise;

    await request(app)
      .get('/api/channels')
      .expect(401);
  });
});
