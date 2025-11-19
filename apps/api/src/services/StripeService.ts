import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { getPlanByStripePrice } from '../config/plans';

export class StripeService {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor(apiKey: string, prisma: PrismaClient) {
    if (!apiKey) {
      throw new Error('Stripe API key is required');
    }
    
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
    
    this.prisma = prisma;
  }

  /**
   * Create a Stripe customer for a tenant
   */
  async createCustomer(
    email: string,
    name: string,
    tenantId: string
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          tenantId,
        },
      });

      // Update tenant with Stripe customer ID
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customer.id },
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error(`Failed to create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    tenantId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          tenantId,
        },
      });

      // Update tenant with subscription details
      const plan = getPlanByStripePrice(priceId);
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPlanId: plan?.id || 'free',
        },
      });

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a subscription to a new price
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    tenantId: string
  ): Promise<Stripe.Subscription> {
    try {
      // Get the subscription
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      if (!subscription || subscription.items.data.length === 0) {
        throw new Error('Subscription not found or has no items');
      }

      // Update the subscription
      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      // Update tenant with new plan details
      const plan = getPlanByStripePrice(newPriceId);
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: updatedSubscription.status,
          currentPlanId: plan?.id || 'free',
        },
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a subscription at the end of the period
   */
  async cancelSubscription(
    subscriptionId: string,
    tenantId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // Update tenant subscription status
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'canceling',
          subscriptionEndDate: new Date((subscription as any).current_period_end * 1000),
        },
      });

      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Immediately cancel a subscription
   */
  async cancelSubscriptionImmediately(
    subscriptionId: string,
    tenantId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);

      // Update tenant to free plan
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'canceled',
          currentPlanId: 'free',
          subscriptionEndDate: new Date(),
        },
      });

      return subscription;
    } catch (error) {
      console.error('Error canceling subscription immediately:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all invoices for a customer
   */
  async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });

      return invoices.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw new Error(`Failed to fetch invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a Checkout Session for new subscriptions
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    tenantId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          tenantId,
        },
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a Customer Portal Session for managing subscriptions
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error(`Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error(`Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw new Error(`Failed to fetch subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }
      
      return customer as Stripe.Customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw new Error(`Failed to fetch customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync invoice to database
   */
  async syncInvoiceToDatabase(invoice: Stripe.Invoice): Promise<void> {
    try {
      const tenantId = invoice.metadata?.tenantId || (invoice as any).subscription_details?.metadata?.tenantId;
      
      if (!tenantId) {
        console.warn('No tenant ID found in invoice metadata, skipping database sync');
        return;
      }

      await this.prisma.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        update: {
          amountPaid: invoice.amount_paid,
          status: invoice.status || 'unknown',
          invoicePdf: invoice.invoice_pdf || undefined,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          stripeInvoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status || 'unknown',
          invoicePdf: invoice.invoice_pdf || undefined,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
        },
      });
    } catch (error) {
      console.error('Error syncing invoice to database:', error);
      throw error;
    }
  }
}
