import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { corsMiddleware } from '../cors';

describe('CORS Middleware', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(corsMiddleware);
    
    // Add a test route
    app.get('/test', (_req, res) => {
      res.json({ success: true });
    });
    
    app.post('/test', (_req, res) => {
      res.json({ success: true });
    });
  });

  describe('Trusted Origins', () => {
    it('should allow requests from configured trusted origin', async () => {
      const trustedOrigin = 'https://chat.genai.hr';
      
      const response = await request(app)
        .get('/test')
        .set('Origin', trustedOrigin);
      
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(trustedOrigin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight OPTIONS request from trusted origin', async () => {
      const trustedOrigin = 'https://chat.genai.hr';
      
      const response = await request(app)
        .options('/test')
        .set('Origin', trustedOrigin)
        .set('Access-Control-Request-Method', 'POST');
      
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(trustedOrigin);
      expect(response.headers['access-control-allow-methods']).toMatch(/POST/);
    });
  });

  describe('Untrusted Origins', () => {
    it('should reject requests from untrusted origin', async () => {
      const untrustedOrigin = 'https://evil.com';
      
      const response = await request(app)
        .get('/test')
        .set('Origin', untrustedOrigin);
      
      // CORS middleware will block this, expect error
      expect(response.status).not.toBe(200);
    });

    it('should reject preflight OPTIONS from untrusted origin', async () => {
      const untrustedOrigin = 'https://malicious.example.com';
      
      const response = await request(app)
        .options('/test')
        .set('Origin', untrustedOrigin)
        .set('Access-Control-Request-Method', 'POST');
      
      // Should not include CORS headers for untrusted origin
      expect(response.headers['access-control-allow-origin']).not.toBe(untrustedOrigin);
    });
  });

  describe('No Origin Header', () => {
    it('should allow requests without Origin header (same-origin, mobile, Postman)', async () => {
      const response = await request(app)
        .get('/test');
      
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Headers', () => {
    it('should expose correct headers', async () => {
      const trustedOrigin = 'https://chat.genai.hr';
      
      const response = await request(app)
        .get('/test')
        .set('Origin', trustedOrigin);
      
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-expose-headers']).toMatch(/x-request-id/);
      expect(response.headers['access-control-expose-headers']).toMatch(/x-correlation-id/);
    });

    it('should allow specified methods', async () => {
      const trustedOrigin = 'https://chat.genai.hr';
      
      const response = await request(app)
        .options('/test')
        .set('Origin', trustedOrigin)
        .set('Access-Control-Request-Method', 'DELETE');
      
      expect(response.headers['access-control-allow-methods']).toMatch(/DELETE/);
      expect(response.headers['access-control-allow-methods']).toMatch(/GET/);
      expect(response.headers['access-control-allow-methods']).toMatch(/POST/);
      expect(response.headers['access-control-allow-methods']).toMatch(/PUT/);
      expect(response.headers['access-control-allow-methods']).toMatch(/PATCH/);
    });

    it('should allow specified headers', async () => {
      const trustedOrigin = 'https://chat.genai.hr';
      
      const response = await request(app)
        .options('/test')
        .set('Origin', trustedOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');
      
      expect(response.headers['access-control-allow-headers']).toMatch(/Content-Type/);
      expect(response.headers['access-control-allow-headers']).toMatch(/Authorization/);
    });
  });
});
