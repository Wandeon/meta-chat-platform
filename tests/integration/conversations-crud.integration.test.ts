import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const appPromise = import('../../apps/api/src/server').then((module) => module.createApp().then(ctx => ctx.app));

describe('Conversation CRUD REST API', () => {
  let tenantApiKey: string;
  let tenantId: string;
  let channelId: string;

  beforeEach(async () => {
    const { prisma } = getIntegrationTestContext();

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Conversation Test Tenant',
        slug: 'conversation-test',
        active: true,
      },
    });
    tenantId = tenant.id;

    // Create channel
    const channel = await prisma.channel.create({
      data: {
        tenantId,
        type: 'webchat',
        name: 'Test Channel',
        config: {},
        active: true,
      },
    });
    channelId = channel.id;

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

  it('should create a new conversation', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/conversations')
      .set('x-api-key', tenantApiKey)
      .send({
        channelId,
        userId: 'test-user-123',
        metadata: {
          source: 'integration-test',
        },
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      channelId,
      userId: 'test-user-123',
      status: 'active',
    });
  });

  it('should list conversations for tenant', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.conversation.create({
      data: {
        tenantId,
        channelId,
        userId: 'list-user',
        status: 'active',
      },
    });

    const response = await request(app)
      .get('/api/conversations')
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should filter by status', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.conversation.create({
      data: {
        tenantId,
        channelId,
        userId: 'active-user',
        status: 'active',
      },
    });

    const response = await request(app)
      .get('/api/conversations?status=active')
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.every((c: any) => c.status === 'active')).toBe(true);
  });

  it('should filter by channelId', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    await prisma.conversation.create({
      data: {
        tenantId,
        channelId,
        userId: 'channel-user',
        status: 'active',
      },
    });

    const response = await request(app)
      .get(`/api/conversations?channelId=${channelId}`)
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.every((c: any) => c.channelId === channelId)).toBe(true);
  });

  it('should get conversation with messages', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        channelId,
        userId: 'detail-user',
        status: 'active',
      },
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          direction: 'inbound',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          conversationId: conversation.id,
          direction: 'outbound',
          content: 'Hi!',
          timestamp: new Date(),
        },
      ],
    });

    const response = await request(app)
      .get(`/api/conversations/${conversation.id}`)
      .set('x-api-key', tenantApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(conversation.id);
    expect(Array.isArray(response.body.data.messages)).toBe(true);
    expect(response.body.data.messages.length).toBeGreaterThan(0);
  });

  it('should update conversation status', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        channelId,
        userId: 'update-user',
        status: 'active',
      },
    });

    const response = await request(app)
      .put(`/api/conversations/${conversation.id}`)
      .set('x-api-key', tenantApiKey)
      .send({
        status: 'closed',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('closed');
  });

  it('should update conversation metadata', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        channelId,
        userId: 'metadata-user',
        status: 'active',
      },
    });

    const response = await request(app)
      .put(`/api/conversations/${conversation.id}`)
      .set('x-api-key', tenantApiKey)
      .send({
        metadata: {
          rating: 5,
          notes: 'Great interaction',
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.metadata).toMatchObject({
      rating: 5,
      notes: 'Great interaction',
    });
  });
});
