import express from 'express';
import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { buildApiLimiter, buildSystemStatusLimiter } from '../rateLimiting';

const rateEnvKeys = [
  'API_RATE_LIMIT_WINDOW_MS',
  'API_RATE_LIMIT_MAX',
  'SYSTEM_RATE_LIMIT_WINDOW_MS',
  'SYSTEM_RATE_LIMIT_MAX',
];

const originalEnv: Record<string, string | undefined> = rateEnvKeys.reduce(
  (acc, key) => ({ ...acc, [key]: process.env[key] }),
  {},
);

describe('rateLimiting middleware', () => {
  beforeEach(() => {
    process.env.API_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.API_RATE_LIMIT_MAX = '2';
    process.env.SYSTEM_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.SYSTEM_RATE_LIMIT_MAX = '2';
  });

  afterEach(() => {
    rateEnvKeys.forEach((key) => {
      const originalValue = originalEnv[key];
      if (typeof originalValue === 'string') {
        process.env[key] = originalValue;
      } else {
        delete process.env[key];
      }
    });
  });

  const buildApiApp = () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use('/api', buildApiLimiter());
    app.get('/api/test', (_req, res) => res.json({ success: true }));
    return app;
  };

  it('limits unauthenticated IP-based traffic', async () => {
    const app = buildApiApp();

    await request(app).get('/api/test');
    await request(app).get('/api/test');
    const blocked = await request(app).get('/api/test');

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('separates buckets per API key instead of IP', async () => {
    const app = buildApiApp();

    await request(app).get('/api/test').set('x-api-key', 'key-1');
    await request(app).get('/api/test').set('x-api-key', 'key-1');
    const newIdentity = await request(app).get('/api/test').set('x-api-key', 'key-2');

    expect(newIdentity.status).toBe(200);
    expect(newIdentity.body.success).toBe(true);
  });

  it('uses admin key buckets distinct from IP traffic', async () => {
    const app = buildApiApp();

    await request(app).get('/api/test');
    await request(app).get('/api/test');
    const adminRequest = await request(app).get('/api/test').set('x-admin-key', 'admin-1');

    expect(adminRequest.status).toBe(200);
    expect(adminRequest.body.success).toBe(true);
  });

  it('applies system status limits to readiness endpoints', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(['/health', '/metrics'], buildSystemStatusLimiter());
    app.get('/health', (_req, res) => res.json({ ok: true }));

    await request(app).get('/health');
    await request(app).get('/health');
    const blocked = await request(app).get('/health');

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
