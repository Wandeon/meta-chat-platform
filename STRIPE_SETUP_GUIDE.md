# Stripe Payment Integration Setup Guide

## Step 1: Create Stripe Products

1. Log in to Stripe Dashboard (https://dashboard.stripe.com)
2. Create Starter Plan (€49/month) 
3. Create Pro Plan (€199/month)
4. Copy the Price IDs

## Step 2: Update Environment Variables

Edit: /home/deploy/meta-chat-platform/apps/api/.env.production

Update:
- STRIPE_SECRET_KEY=sk_test_your_key
- STRIPE_PUBLISHABLE_KEY=pk_test_your_key  
- STRIPE_PRICE_STARTER=price_your_id
- STRIPE_PRICE_PRO=price_your_id

## Step 3: Set Up Webhooks

In Stripe Dashboard > Webhooks:
- Endpoint URL: https://chat.genai.hr/api/webhooks/stripe
- Events: checkout.session.completed, invoice.paid, customer.subscription.*
- Copy webhook secret to STRIPE_WEBHOOK_SECRET

## Step 4: Build and Deploy

```bash
cd /home/deploy/meta-chat-platform/apps/api
npm run build
pm2 restart meta-chat-api
```

## Test

Navigate to https://chat.genai.hr/billing
Use test card: 4242 4242 4242 4242

## Files Created

Backend:
- apps/api/src/services/StripeService.ts
- apps/api/src/config/plans.ts
- apps/api/src/routes/billing/index.ts
- apps/api/src/routes/webhooks/stripe.ts
- apps/api/src/middleware/usageTracking.ts

Frontend:
- apps/dashboard/src/pages/BillingPage.tsx

Database:
- packages/database/prisma/migrations/20251119000200_add_stripe_billing/
