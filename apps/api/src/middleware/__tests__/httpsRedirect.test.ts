import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { httpsRedirect, hstsHeader } from '../httpsRedirect';

describe('HTTPS Redirect Middleware', () => {
  let app: express.Express;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);
    app.use(hstsHeader);
    app.use(httpsRedirect);
    app.get('/test', (req, res) => res.json({ success: true }));
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Development Environment', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should allow HTTP requests', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should not set HSTS header in development', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('Production Environment', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
    });

    afterAll(() => {
      delete process.env.ENFORCE_HTTPS;
    });

    it('should block HTTP requests', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('HTTPS_REQUIRED');
    });

    it('should allow HTTPS requests with X-Forwarded-Proto header', async () => {
      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https');
      expect(response.status).toBe(200);
    });

    it('should set HSTS header on HTTPS requests', async () => {
      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https');
      expect(response.headers['strict-transport-security']).toMatch(/max-age=31536000/);
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
      expect(response.headers['strict-transport-security']).toContain('preload');
    });

    it('should allow disabling HTTPS enforcement via env var', async () => {
      process.env.ENFORCE_HTTPS = 'false';
      const testApp = express();
      testApp.set('trust proxy', 1);
      testApp.use(hstsHeader);
      testApp.use(httpsRedirect);
      testApp.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(testApp).get('/test');
      expect(response.status).toBe(200);
    });
  });
});
