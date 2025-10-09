import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { getIntegrationTestContext } from './setup/environment';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const appPromise = import('../../apps/api/src/server').then((module) => module.default);

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
});
