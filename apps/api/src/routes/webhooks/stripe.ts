import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { StripeService } from '../../services/StripeService';
import { getPlanByStripePrice } from '../../config/plans';

const router = Router();
const prisma = new PrismaClient();

// Extend Request type to include rawBody
type RawBodyRequest = Request & { rawBody?: Buffer };

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
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events with signature verification
 *
 * SECURITY: This endpoint verifies Stripe webhook signatures to prevent forged events
 * The raw body is required for signature verification (stored by express.json verify callback)
 */
router.post('/stripe', async (req: RawBodyRequest, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Validate required parameters
  if (!sig) {
    console.error('Missing stripe-signature header');
    return res.status(400).send('Webhook Error: Missing signature header');
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook Error: Webhook secret not configured');
  }

  // Use raw body for signature verification (set by express.json verify callback)
  const rawBody = req.rawBody;
  if (!rawBody) {
    console.error('Raw body not available for signature verification');
    return res.status(400).send('Webhook Error: Raw body required for signature verification');
  }

  let event: Stripe.Event;

  try {
    // Get Stripe service
    const stripeService = getStripeService();

    // Verify webhook signature using raw body
    event = stripeService.verifyWebhookSignature(
      rawBody,
      sig as string,
      webhookSecret
    );

    console.log(`✅ Webhook signature verified for event: ${event.type}`);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  console.log(`Received Stripe webhook event: ${event.type}`);

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle checkout.session.completed event
 * Update tenant subscription when payment is successful
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const tenantId = session.metadata?.tenantId;
  if (!tenantId) {
    console.error('No tenant ID in session metadata');
    return;
  }

  // Get the subscription
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('No subscription ID in session');
    return;
  }

  const stripeService = getStripeService();
  const subscription = await stripeService.getSubscription(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByStripePrice(priceId);

  // Extract current_period_end from subscription items (new Stripe API structure)
  let currentPeriodEnd: number | null = null;
  if (subscription.items && subscription.items.data.length > 0) {
    currentPeriodEnd = subscription.items.data[0].current_period_end;
  }

  // Update tenant with subscription details
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
      currentPlanId: plan?.id || 'free',
      subscriptionEndDate: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
    },
  });

  console.log(`Tenant ${tenantId} subscription activated`);
}

/**
 * Handle invoice.paid event
 * Renew subscription and sync invoice to database
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Processing invoice.paid:', invoice.id);

  const stripeService = getStripeService();

  // Sync invoice to database
  await stripeService.syncInvoiceToDatabase(invoice);

  // If this is a subscription invoice, ensure tenant status is active
  if ((invoice as any).subscription) {
    const subscription = await stripeService.getSubscription((invoice as any).subscription as string);
    const tenantId = subscription.metadata?.tenantId;

    if (tenantId) {
      const priceId = subscription.items.data[0]?.price.id;
      const plan = getPlanByStripePrice(priceId);

      // Extract current_period_end from subscription items (new Stripe API structure)
      let currentPeriodEnd: number | null = null;
      if (subscription.items && subscription.items.data.length > 0) {
        currentPeriodEnd = subscription.items.data[0].current_period_end;
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'active',
          currentPlanId: plan?.id || 'free',
          subscriptionEndDate: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
        },
      });

      console.log(`Tenant ${tenantId} subscription renewed`);
    }
  }
}

/**
 * Handle invoice.payment_failed event
 * Suspend tenant access when payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);

  const stripeService = getStripeService();

  // Sync invoice to database
  await stripeService.syncInvoiceToDatabase(invoice);

  // If this is a subscription invoice, mark tenant as past_due
  if ((invoice as any).subscription) {
    const subscription = await stripeService.getSubscription((invoice as any).subscription as string);
    const tenantId = subscription.metadata?.tenantId;

    if (tenantId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'past_due',
        },
      });

      console.log(`Tenant ${tenantId} marked as past_due due to payment failure`);

      // TODO: Send email notification to tenant
      // TODO: Consider suspending access after grace period
    }
  }
}

/**
 * Handle customer.subscription.updated event
 * Handle plan changes, cancellations, renewals
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.updated:', subscription.id);

  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.error('No tenant ID in subscription metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByStripePrice(priceId);

  // Extract current_period_end from subscription items (new Stripe API structure)
  let currentPeriodEnd: number | null = null;
  if (subscription.items && subscription.items.data.length > 0) {
    currentPeriodEnd = subscription.items.data[0].current_period_end;
  }

  // Update tenant subscription details
  const updateData: any = {
    subscriptionStatus: subscription.status,
    subscriptionEndDate: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
  };

  // If subscription is active or trialing, update the plan
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    updateData.currentPlanId = plan?.id || 'free';
  }

  // If subscription is canceled, prepare for downgrade
  if (subscription.cancel_at_period_end) {
    updateData.subscriptionStatus = 'canceling';
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: updateData,
  });

  console.log(`Tenant ${tenantId} subscription updated to ${subscription.status}`);
}

/**
 * Handle customer.subscription.deleted event
 * Downgrade tenant to free plan when subscription is canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.deleted:', subscription.id);

  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.error('No tenant ID in subscription metadata');
    return;
  }

  // Downgrade tenant to free plan
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionStatus: 'canceled',
      currentPlanId: 'free',
      stripeSubscriptionId: null,
      subscriptionEndDate: new Date(),
    },
  });

  console.log(`Tenant ${tenantId} subscription canceled, downgraded to free plan`);

  // TODO: Send email notification
  // TODO: Clean up resources if needed (e.g., archive old data)
}

/**
 * Handle customer.subscription.created event
 * Track new subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.created:', subscription.id);

  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.error('No tenant ID in subscription metadata');
    return;
  }

  // This is usually handled by checkout.session.completed
  // but we log it here for audit purposes
  console.log(`New subscription created for tenant ${tenantId}`);
}

export default router;
