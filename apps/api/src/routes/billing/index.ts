import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { StripeService } from '../../services/StripeService';
import { PLANS, getPlan, getPaidPlans } from '../../config/plans';

const router = Router();
const prisma = new PrismaClient();

/**
 * Get or create StripeService instance
 * Lazy initialization to avoid errors if Stripe key is not configured
 */
function getStripeService(): StripeService {
  const apiKey = process.env.STRIPE_SECRET_KEY || '';
  if (!apiKey) {
    throw new Error('Stripe API key not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  return new StripeService(apiKey, prisma);
}

/**
 * Middleware to extract tenant from request
 * Assumes tenant is attached to req by upstream auth middleware
 * Extended interface for billing-specific tenant data
 */
interface BillingTenantData {
  id: string;
  name: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string;
  currentPlanId?: string;
}

/**
 * POST /api/billing/create-checkout-session
 * Create a Stripe Checkout session for subscribing to a plan
 */
router.post(
  '/create-checkout-session',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planId } = req.body;
      
      // Get tenant ID from authenticated request
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Fetch full tenant data from database
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          currentPlanId: true,
        },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Validate plan
      const plan = getPlan(planId);
      if (!plan || !plan.stripePrice) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }

      // Get Stripe service
      const stripeService = getStripeService();

      // Check if tenant already has a Stripe customer
      let customerId = tenant.stripeCustomerId;
      
      if (!customerId) {
        // Create Stripe customer if not exists
        const customer = await stripeService.createCustomer(
          `tenant-${tenant.id}@genai.hr`,
          tenant.name,
          tenant.id
        );
        customerId = customer.id;
      }

      // Create checkout session
      const successUrl = process.env.STRIPE_SUCCESS_URL || 'https://chat.genai.hr/billing/success';
      const cancelUrl = process.env.STRIPE_CANCEL_URL || 'https://chat.genai.hr/billing';

      const session = await stripeService.createCheckoutSession(
        customerId,
        plan.stripePrice,
        tenant.id,
        `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl
      );

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      next(error);
    }
  }
);

/**
 * POST /api/billing/create-portal-session
 * Create a Stripe Customer Portal session for managing billing
 */
router.post(
  '/create-portal-session',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get tenant ID from authenticated request
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Fetch full tenant data from database
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          stripeCustomerId: true,
        },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      if (!tenant.stripeCustomerId) {
        return res.status(400).json({ error: 'No billing account found' });
      }

      const returnUrl = process.env.STRIPE_CANCEL_URL || 'https://chat.genai.hr/billing';
      
      // Get Stripe service
      const stripeService = getStripeService();
      
      const session = await stripeService.createPortalSession(
        tenant.stripeCustomerId,
        returnUrl
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating portal session:', error);
      next(error);
    }
  }
);

/**
 * GET /api/billing/subscription
 * Get current subscription status and details
 */
router.get(
  '/subscription',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get tenant ID from authenticated request
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Fetch full tenant data from database
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          currentPlanId: true,
        },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Get current plan details
      const currentPlan = getPlan(tenant.currentPlanId || 'free');
      
      // Get usage tracking for current period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const usage = await prisma.usageTracking.findFirst({
        where: {
          tenantId: tenant.id,
          periodStart: periodStart,
        },
      });

      // Get Stripe subscription if exists
      let stripeSubscription = null;
      if (tenant.stripeSubscriptionId) {
        try {
          const stripeService = getStripeService();
          stripeSubscription = await stripeService.getSubscription(tenant.stripeSubscriptionId);
        } catch (error) {
          console.error('Error fetching Stripe subscription:', error);
        }
      }

      // Get invoices
      let invoices: any[] = [];
      if (tenant.stripeCustomerId) {
        try {
          const stripeService = getStripeService();
          const stripeInvoices = await stripeService.getInvoices(tenant.stripeCustomerId, 10);
          invoices = stripeInvoices.map(inv => ({
            id: inv.id,
            amountPaid: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            invoicePdf: inv.invoice_pdf,
            hostedInvoiceUrl: inv.hosted_invoice_url,
            created: inv.created,
            periodStart: inv.period_start,
            periodEnd: inv.period_end,
          }));
        } catch (error) {
          console.error('Error fetching invoices:', error);
        }
      }

      // Extract current_period_end from subscription items (new Stripe API structure)
      let currentPeriodEnd: number | null = null;
      if (stripeSubscription && stripeSubscription.items && stripeSubscription.items.data.length > 0) {
        currentPeriodEnd = stripeSubscription.items.data[0].current_period_end;
      }

      res.json({
        currentPlan,
        subscriptionStatus: tenant.subscriptionStatus || 'free',
        usage: usage || {
          conversationsCount: 0,
          documentsCount: 0,
          teamMembersCount: 0,
          messagesCount: 0,
          apiCallsCount: 0,
        },
        stripeSubscription: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        } : null,
        invoices,
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      next(error);
    }
  }
);

/**
 * GET /api/billing/plans
 * Get all available subscription plans
 */
router.get('/plans', (req: Request, res: Response) => {
  const plans = getPaidPlans();
  res.json({ plans: Object.values(PLANS) });
});

/**
 * POST /api/billing/cancel-subscription
 * Cancel subscription at end of period
 */
router.post(
  '/cancel-subscription',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get tenant ID from authenticated request
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Fetch full tenant data from database
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          stripeSubscriptionId: true,
        },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      if (!tenant.stripeSubscriptionId) {
        return res.status(400).json({ error: 'No active subscription found' });
      }

      // Get Stripe service
      const stripeService = getStripeService();

      const subscription = await stripeService.cancelSubscription(
        tenant.stripeSubscriptionId,
        tenant.id
      );

      // Extract current_period_end from subscription items (new Stripe API structure)
      let cancelAt: number | null = null;
      if (subscription && subscription.items && subscription.items.data.length > 0) {
        cancelAt = subscription.items.data[0].current_period_end;
      }

      res.json({
        success: true,
        message: 'Subscription will be canceled at the end of the billing period',
        cancelAt: cancelAt,
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      next(error);
    }
  }
);

export default router;
