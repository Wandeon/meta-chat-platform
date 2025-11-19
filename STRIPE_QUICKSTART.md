# Stripe Integration - Quick Start

## Status: 95% Complete

## What Works Now
✅ All code implemented
✅ Database migrated
✅ Routes registered
✅ UI created

## What You Need to Do

### 1. Fix TypeScript (5 min)
```bash
cd /home/deploy/meta-chat-platform/apps/api
npm install stripe@16.0.0
npm run build
```

### 2. Set Up Stripe Account (20 min)
1. Go to https://stripe.com and create account
2. Dashboard > Products > Add Product
   - Name: "Starter Plan", Price: €49/month → Copy Price ID
   - Name: "Pro Plan", Price: €199/month → Copy Price ID
3. Dashboard > Developers > API keys
   - Copy Secret Key (sk_test_...)
   - Copy Publishable Key (pk_test_...)

### 3. Update Config (2 min)
Edit: `/home/deploy/meta-chat-platform/apps/api/.env.production`

Replace:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY
STRIPE_PRICE_STARTER=price_YOUR_STARTER_ID
STRIPE_PRICE_PRO=price_YOUR_PRO_ID
```

### 4. Set Up Webhook (5 min)
1. Stripe Dashboard > Developers > Webhooks > Add endpoint
2. URL: `https://chat.genai.hr/api/webhooks/stripe`
3. Events: Select all `customer.subscription.*` and `invoice.*`
4. Copy Webhook Secret (whsec_...)
5. Add to .env.production: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 5. Deploy (2 min)
```bash
cd /home/deploy/meta-chat-platform/apps/api
npm run build
pm2 restart meta-chat-api
```

### 6. Test (5 min)
1. Visit: https://chat.genai.hr/billing
2. Click "Upgrade" on Starter plan
3. Use test card: `4242 4242 4242 4242`
4. Any future date, any CVC
5. Complete checkout
6. ✅ Success!

## Files Created

All files at: `/home/deploy/meta-chat-platform/`

**Backend**:
- `apps/api/src/services/StripeService.ts`
- `apps/api/src/config/plans.ts`
- `apps/api/src/routes/billing/index.ts`
- `apps/api/src/routes/webhooks/stripe.ts`
- `apps/api/src/middleware/usageTracking.ts`

**Frontend**:
- `apps/dashboard/src/pages/BillingPage.tsx`

**Database**:
- `packages/database/prisma/migrations/20251119000200_add_stripe_billing/`

## Documentation

- `STRIPE_COMPLETION_REPORT.md` - Full completion status
- `STRIPE_IMPLEMENTATION_SUMMARY.md` - Technical details
- `STRIPE_SETUP_GUIDE.md` - Detailed setup steps
- `FILES_CREATED_STRIPE.txt` - All files list

## Need Help?

Check the error:
```bash
cd /home/deploy/meta-chat-platform/apps/api
npm run build
```

Check logs:
```bash
pm2 logs meta-chat-api
```

Verify database:
```bash
docker exec -it meta-chat-postgres psql -U metachat -d metachat -c "SELECT stripe_customer_id, subscription_status, current_plan_id FROM tenants LIMIT 5;"
```

## Total Time: ~40 minutes
