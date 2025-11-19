import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { StripeService } from '../services/StripeService';
import { getPlan } from '../config/plans';

describe('Stripe Integration Tests', () => {
  let prisma: PrismaClient;
  let stripeService: StripeService;
  let testTenantId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('Skipping Stripe tests - no STRIPE_SECRET_KEY');
      return;
    }

    stripeService = new StripeService(process.env.STRIPE_SECRET_KEY, prisma);
    
    const testTenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant for Stripe',
      },
    });
    testTenantId = testTenant.id;
  });

  afterAll(async () => {
    if (testTenantId) {
      await prisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('Plan Configuration', () => {
    it('should have valid plan configurations', () => {
      const freePlan = getPlan('free');
      expect(freePlan).toBeDefined();
      expect(freePlan?.price).toBe(0);
      expect(freePlan?.stripePrice).toBeNull();

      const starterPlan = getPlan('starter');
      expect(starterPlan).toBeDefined();
      expect(starterPlan?.price).toBeGreaterThan(0);
      
      const proPlan = getPlan('pro');
      expect(proPlan).toBeDefined();
      expect(proPlan?.price).toBeGreaterThan(0);
    });
  });
});
