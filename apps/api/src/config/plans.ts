/**
 * Subscription Plans Configuration
 * 
 * NOTE: Update Stripe price IDs after creating products in Stripe Dashboard
 * Test Mode: Use price_test_... IDs
 * Production: Use price_... IDs
 */

export interface PlanLimits {
  conversations: number;
  documents: number;
  teamMembers: number;
  messagesPerMonth: number;
  apiCallsPerMonth: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // Price in cents (EUR)
  currency: string;
  interval: 'month' | 'year';
  stripePrice: string | null; // Stripe Price ID
  limits: PlanLimits;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for testing and small projects',
    price: 0,
    currency: 'eur',
    interval: 'month',
    stripePrice: null, // No Stripe price for free tier
    limits: {
      conversations: 100,
      documents: 10,
      teamMembers: 1,
      messagesPerMonth: 1000,
      apiCallsPerMonth: 5000,
    },
    features: [
      'Up to 100 conversations',
      'Up to 10 documents',
      '1 team member',
      '1,000 messages/month',
      'Basic support',
      'Web chat widget',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Great for growing businesses',
    price: 4900, // €49.00
    currency: 'eur',
    interval: 'month',
    stripePrice: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder', // Update after Stripe setup
    limits: {
      conversations: 1000,
      documents: 100,
      teamMembers: 5,
      messagesPerMonth: 10000,
      apiCallsPerMonth: 50000,
    },
    features: [
      'Up to 1,000 conversations',
      'Up to 100 documents',
      '5 team members',
      '10,000 messages/month',
      'Priority support',
      'Web chat widget',
      'WhatsApp integration',
      'Facebook Messenger',
      'Analytics dashboard',
    ],
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For professional teams and enterprises',
    price: 19900, // €199.00
    currency: 'eur',
    interval: 'month',
    stripePrice: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder', // Update after Stripe setup
    limits: {
      conversations: 10000,
      documents: 1000,
      teamMembers: 20,
      messagesPerMonth: 100000,
      apiCallsPerMonth: 500000,
    },
    features: [
      'Up to 10,000 conversations',
      'Up to 1,000 documents',
      '20 team members',
      '100,000 messages/month',
      'Dedicated support',
      'Web chat widget',
      'WhatsApp integration',
      'Facebook Messenger',
      'Advanced analytics',
      'Custom integrations',
      'API access',
      'SLA guarantee',
    ],
  },
};

/**
 * Get plan by ID
 */
export function getPlan(planId: string): SubscriptionPlan | undefined {
  return PLANS[planId];
}

/**
 * Get plan by Stripe Price ID
 */
export function getPlanByStripePrice(stripePriceId: string): SubscriptionPlan | undefined {
  return Object.values(PLANS).find(plan => plan.stripePrice === stripePriceId);
}

/**
 * Get all available plans (excluding free tier for display)
 */
export function getAvailablePlans(): SubscriptionPlan[] {
  return Object.values(PLANS);
}

/**
 * Get paid plans only
 */
export function getPaidPlans(): SubscriptionPlan[] {
  return Object.values(PLANS).filter(plan => plan.price > 0);
}

/**
 * Check if a plan allows a specific limit
 */
export function checkLimit(
  planId: string,
  limitType: keyof PlanLimits,
  currentUsage: number
): { allowed: boolean; limit: number; remaining: number } {
  const plan = getPlan(planId);
  if (!plan) {
    return { allowed: false, limit: 0, remaining: 0 };
  }

  const limit = plan.limits[limitType];
  const remaining = Math.max(0, limit - currentUsage);
  const allowed = currentUsage < limit;

  return { allowed, limit, remaining };
}
