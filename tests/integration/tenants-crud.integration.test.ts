import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const appPromise = import('../../apps/api/src/server').then((module) => module.createApp().then(ctx => ctx.app));

describe('Tenant CRUD REST API', () => {
  let adminApiKey: string;

  beforeEach(async () => {
    const { prisma } = getIntegrationTestContext();

    // Create admin user and API key
    const admin = await prisma.adminUser.create({
      data: {
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'SUPER',
      },
    });

    const keyMetadata = generateApiKey('adm');
    const hashed = await hashSecret(keyMetadata.apiKey);

    await prisma.adminApiKey.create({
      data: {
        adminId: admin.id,
        label: 'test-admin-key',
        prefix: keyMetadata.prefix,
        hash: hashed.hash,
        salt: hashed.salt,
        lastFour: keyMetadata.lastFour,
      },
    });

    adminApiKey = keyMetadata.apiKey;
  });

  it('should create a new tenant', async () => {
    const app = await appPromise;

    const response = await request(app)
      .post('/api/tenants')
      .set('x-admin-key', adminApiKey)
      .send({
        name: 'Test Tenant',
        slug: 'test-tenant',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.tenant).toMatchObject({
      name: 'Test Tenant',
      slug: 'test-tenant',
      active: true,
    });
    expect(response.body.data.apiKey).toBeDefined();
  });

  it('should list all tenants', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    // Create a tenant
    await prisma.tenant.create({
      data: {
        name: 'List Test Tenant',
        slug: 'list-test',
        active: true,
      },
    });

    const response = await request(app)
      .get('/api/tenants')
      .set('x-admin-key', adminApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should get a specific tenant', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Detail Test Tenant',
        slug: 'detail-test',
        active: true,
      },
    });

    const response = await request(app)
      .get(`/api/tenants/${tenant.id}`)
      .set('x-admin-key', adminApiKey)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(tenant.id);
  });

  it('should update a tenant', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Update Test',
        slug: 'update-test',
        active: true,
      },
    });

    const response = await request(app)
      .put(`/api/tenants/${tenant.id}`)
      .set('x-admin-key', adminApiKey)
      .send({
        name: 'Updated Name',
        active: false,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Name');
    expect(response.body.data.active).toBe(false);
  });

  it('should reject requests without admin auth', async () => {
    const app = await appPromise;

    await request(app)
      .get('/api/tenants')
      .expect(401);
  });
});
