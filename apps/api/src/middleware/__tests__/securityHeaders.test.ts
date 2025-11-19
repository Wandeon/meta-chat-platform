import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { securityHeaders } from '../securityHeaders';

describe('Security Headers Middleware', () => {
  let app: express.Express;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    app = express();
    app.use(securityHeaders);
    app.get('/test', (req, res) => res.json({ success: true }));
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should set X-Frame-Options header', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('should set X-Content-Type-Options header', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set X-XSS-Protection header', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });

  it('should set Referrer-Policy header', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('should set Permissions-Policy header', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['permissions-policy']).toContain('geolocation=()');
    expect(response.headers['permissions-policy']).toContain('microphone=()');
    expect(response.headers['permissions-policy']).toContain('camera=()');
    expect(response.headers['permissions-policy']).toContain('payment=()');
  });

  describe('Production Environment', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should set CSP header in production', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Development Environment', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should not set CSP header in development', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['content-security-policy']).toBeUndefined();
    });
  });
});
