import express from 'express';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

import { authenticateTenantUser } from './authenticateTenantUser';

describe('authenticateTenantUser middleware', () => {
  const app = express();
  const originalSecret = process.env.ADMIN_JWT_SECRET;
  const adminSecret = 'test-admin-secret';

  beforeAll(() => {
    process.env.ADMIN_JWT_SECRET = adminSecret;

    app.get('/protected', authenticateTenantUser, (_req, res) => {
      res.json({ success: true });
    });
  });

  afterAll(() => {
    process.env.ADMIN_JWT_SECRET = originalSecret;
  });

  it('should return 401 for malformed token', async () => {
    const response = await supertest(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or expired authentication token',
    });
  });

  it('should return 401 for expired token', async () => {
    const expiredToken = jwt.sign(
      {
        userId: 'user-123',
        tenantId: 'tenant-123',
        email: 'user@example.com',
        type: 'tenant_user',
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      adminSecret,
      { issuer: 'meta-chat-platform' },
    );

    const response = await supertest(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or expired authentication token',
    });
  });
});
