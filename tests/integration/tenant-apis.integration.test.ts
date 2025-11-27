import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';
import { generateToken } from '../../apps/api/src/utils/jwt';
import tenantRouter from '../../apps/api/src/routes/tenants';

process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? 'test-admin-jwt-secret';
const appPromise = import('../../apps/api/src/server').then(async (module) => {
  const { app } = await module.createApp();

  app.use('/api/tenants', tenantRouter);

  app.use((error: any, _req: any, res: any, _next: any) => {
    const status = error.status ?? 500;
    res.status(status).json({
      success: false,
      error: {
        message: error.message ?? 'Internal Server Error',
        code: error.code ?? (status === 500 ? 'internal_error' : 'error'),
        details: error.errors ?? error.details,
      },
    });
  });

  return app;
});

describe('Tenant security API', () => {
  it('creates and rotates tenant API keys using admin privileges', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Acme Corp',
        settings: {},
      },
    });

    const admin = await prisma.adminUser.create({
      data: {
        email: 'admin@example.com',
        name: 'Super Admin',
        role: 'SUPER',
      },
    });

    const adminKeyMetadata = generateApiKey('adm');
    const adminHashed = await hashSecret(adminKeyMetadata.apiKey);
    await prisma.adminApiKey.create({
      data: {
        adminId: admin.id,
        label: 'integration-test',
        prefix: adminKeyMetadata.prefix,
        hash: adminHashed.hash,
        salt: adminHashed.salt,
        lastFour: adminKeyMetadata.lastFour,
      },
    });

    const createResponse = await request(app)
      .post(`/api/security/tenants/${tenant.id}/api-keys`)
      .set('x-admin-key', adminKeyMetadata.apiKey)
      .send({ label: 'primary' })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: expect.any(String),
      apiKey: expect.stringContaining('ten_'),
      prefix: expect.any(String),
      lastFour: expect.any(String),
    });

    const createdKey = await prisma.tenantApiKey.findUnique({ where: { id: createResponse.body.id } });
    expect(createdKey?.tenantId).toBe(tenant.id);

    const rotationResponse = await request(app)
      .post(`/api/security/tenants/${tenant.id}/api-keys/${createdKey!.id}/rotation`)
      .set('x-admin-key', adminKeyMetadata.apiKey)
      .expect(200);

    expect(rotationResponse.body.rotationToken).toBeDefined();

    const confirmResponse = await request(app)
      .post(`/api/security/tenants/${tenant.id}/api-keys/${createdKey!.id}/rotation/confirm`)
      .set('x-admin-key', adminKeyMetadata.apiKey)
      .send({ token: rotationResponse.body.rotationToken })
      .expect(200);

    expect(confirmResponse.body.apiKey).toBeDefined();

    const updatedKey = await prisma.tenantApiKey.findUnique({ where: { id: createdKey!.id } });
    expect(updatedKey?.rotationTokenHash).toBeNull();
    expect(updatedKey?.lastFour).toBe(confirmResponse.body.lastFour);
  });

  it('denies access to other tenants for tenant-scoped users', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const [tenantA, tenantB] = await prisma.$transaction([
      prisma.tenant.create({
        data: {
          name: 'Tenant A',
          settings: {},
        },
      }),
      prisma.tenant.create({
        data: {
          name: 'Tenant B',
          settings: {},
        },
      }),
    ]);

    const token = generateToken({
      userId: 'user-a',
      tenantId: tenantA.id,
      email: 'user-a@example.com',
    });

    const response = await request(app)
      .get(`/api/tenants/${tenantB.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(String(response.body.error?.message ?? response.body.error)).toMatch(/access denied/i);
    expect(response.body.data).toBeUndefined();
  });
});
