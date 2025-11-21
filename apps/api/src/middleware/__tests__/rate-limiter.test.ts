import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createAuthRateLimiter } from '../rate-limiter';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      ttl: vi.fn(),
    })),
  };
});

describe('Rate Limiter Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Create a test route with rate limiting
    const authRateLimiter = createAuthRateLimiter();
    app.use('/api/auth', authRateLimiter);

    // Add a test endpoint
    app.post('/api/auth/test', (req, res) => {
      res.json({ success: true, message: 'Request successful' });
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiting Behavior', () => {
    it('should allow requests within limit', async () => {
      const response = await request(app).post('/api/auth/test').send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Request successful',
      });
    });

    it('should set rate limit headers', async () => {
      const response = await request(app).post('/api/auth/test').send({});

      // Rate limit headers should be present
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should block requests after limit is exceeded (in-memory)', async () => {
      // Make 6 requests rapidly (limit is 5)
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(request(app).post('/api/auth/test').send({}));
      }

      const responses = await Promise.all(requests);

      // Count successful and rate-limited responses
      const successfulRequests = responses.filter((r) => r.status === 200);
      const rateLimitedRequests = responses.filter((r) => r.status === 429);

      // Should have 5 successful requests and 1 rate-limited
      expect(successfulRequests.length).toBe(5);
      expect(rateLimitedRequests.length).toBe(1);
    });

    it('should return 429 with proper error message when rate limited', async () => {
      // Make 6 requests to exceed the limit
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/test').send({});
      }

      // This request should be rate limited
      const response = await request(app).post('/api/auth/test').send({});

      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many authentication attempts. Please try again later.',
        },
      });
    });

    it('should include retry-after information in rate limit response', async () => {
      // Exceed the rate limit
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/test').send({});
      }

      const response = await request(app).post('/api/auth/test').send({});

      expect(response.status).toBe(429);
      // Rate limit headers should indicate when to retry
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should create rate limiter with correct settings', () => {
      const rateLimiter = createAuthRateLimiter();

      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter).toBe('function');
    });

    it('should use in-memory store when Redis URL is not configured', () => {
      // Temporarily remove Redis URL
      const originalRedisUrl = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const rateLimiter = createAuthRateLimiter();

      expect(rateLimiter).toBeDefined();

      // Restore Redis URL
      if (originalRedisUrl) {
        process.env.REDIS_URL = originalRedisUrl;
      }
    });
  });

  describe('Different IP Addresses', () => {
    it('should track rate limits separately per IP', async () => {
      // Create app with IP forwarding enabled
      const app2 = express();
      app2.set('trust proxy', true);
      app2.use(express.json());

      const authRateLimiter = createAuthRateLimiter();
      app2.use('/api/auth', authRateLimiter);
      app2.post('/api/auth/test', (req, res) => {
        res.json({ success: true });
      });

      // Make 5 requests from first IP
      for (let i = 0; i < 5; i++) {
        await request(app2)
          .post('/api/auth/test')
          .set('X-Forwarded-For', '192.168.1.1')
          .send({});
      }

      // Request from second IP should not be rate limited
      const response = await request(app2)
        .post('/api/auth/test')
        .set('X-Forwarded-For', '192.168.1.2')
        .send({});

      expect(response.status).toBe(200);
    });
  });
});
