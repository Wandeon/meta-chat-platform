import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { getIntegrationTestContext } from './setup/environment';
import { hashPassword, verifyPassword } from '../../apps/api/src/utils/password';

const appPromise = import('../../apps/api/src/server').then((module) =>
  module.createApp().then((ctx) => ctx.app)
);

describe('Password reset flow', () => {
  it('allows resetting password with token and marks token as used', async () => {
    const app = await appPromise;
    const { prisma } = getIntegrationTestContext();

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Password Reset Tenant',
        slug: 'password-reset-tenant',
        active: true,
      },
    });

    const originalPassword = 'OldPass123!';
    const newPassword = 'NewSecurePass456!';

    const user = await prisma.tenantUser.create({
      data: {
        tenantId: tenant.id,
        email: 'user@example.com',
        password: await hashPassword(originalPassword),
        name: 'Reset User',
        emailVerified: true,
      },
    });

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: { tenantUserId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(resetTokenRecord).toBeTruthy();
    const token = resetTokenRecord!.token;

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword })
      .expect(200);

    const updatedToken = await prisma.passwordResetToken.findUnique({
      where: { id: resetTokenRecord!.id },
    });

    expect(updatedToken?.used).toBe(true);

    const updatedUser = await prisma.tenantUser.findUnique({ where: { id: user.id } });
    expect(updatedUser).toBeTruthy();
    expect(await verifyPassword(newPassword, updatedUser!.password)).toBe(true);
    expect(await verifyPassword(originalPassword, updatedUser!.password)).toBe(false);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: newPassword })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: originalPassword })
      .expect(401);
  });
});
