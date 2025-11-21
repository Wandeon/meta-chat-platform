import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import billingRouter from '../billing';
import { authenticateTenant } from '../../middleware/auth';

// Mock the auth middleware
vi.mock('../../middleware/auth', () => ({
  authenticateTenant: vi.fn((req, res, next) => {
    // Check if the test is simulating an authenticated request
    if (req.headers['x-test-authenticated'] === 'true') {
      req.tenant = {
        id: 'test-tenant-123',
        apiKeyId: 'test-key-123',
      };
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }),
}));

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    tenant: {
      findUnique: vi.fn(),
    },
    usageTracking: {
      findFirst: vi.fn(),
    },
  })),
}));

// Mock StripeService
vi.mock('../../services/StripeService', () => ({
  StripeService: vi.fn().mockImplementation(() => ({
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    getSubscription: vi.fn(),
    getInvoices: vi.fn(),
  })),
}));

// Mock plans
vi.mock('../../config/plans', () => ({
  PLANS: {
    free: { id: 'free', name: 'Free' },
    starter: { id: 'starter', name: 'Starter', stripePrice: 'price_starter' },
  },
  getPlan: vi.fn((id) => ({
    id,
    name: 'Test Plan',
    stripePrice: 'price_test',
  })),
  getPaidPlans: vi.fn(() => []),
}));

describe('Billing Routes Authentication Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/billing', billingRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/billing/create-checkout-session', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .send({ planId: 'starter' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should accept authenticated requests', async () => {
      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .set('x-test-authenticated', 'true')
        .send({ planId: 'starter' });

      // May fail due to missing tenant in DB, but should not be 401
      expect(response.status).not.toBe(401);
    });

    it('should call authenticateTenant middleware', async () => {
      await request(app)
        .post('/api/billing/create-checkout-session')
        .send({ planId: 'starter' });

      expect(authenticateTenant).toHaveBeenCalled();
    });
  });

  describe('POST /api/billing/create-portal-session', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/billing/create-portal-session')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should accept authenticated requests', async () => {
      const response = await request(app)
        .post('/api/billing/create-portal-session')
        .set('x-test-authenticated', 'true')
        .send({});

      // May fail due to missing tenant in DB, but should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/billing/subscription', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/billing/subscription');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should accept authenticated requests', async () => {
      const response = await request(app)
        .get('/api/billing/subscription')
        .set('x-test-authenticated', 'true');

      // May fail due to missing tenant in DB, but should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/billing/cancel-subscription', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/billing/cancel-subscription')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should accept authenticated requests', async () => {
      const response = await request(app)
        .post('/api/billing/cancel-subscription')
        .set('x-test-authenticated', 'true')
        .send({});

      // May fail due to missing tenant in DB, but should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/billing/plans', () => {
    it('should allow unauthenticated access to plans endpoint', async () => {
      const response = await request(app).get('/api/billing/plans');

      // Plans endpoint should be public
      expect(response.status).toBe(200);
    });
  });
});
