# Meta Chat Platform - Deployment Guide

## What Changed

The confidence-based escalation system is now **fully integrated** into the production system with:

1. **New Worker Process** - Handles async message processing from RabbitMQ queues
2. **Enhanced Webchat API** - Integrates confidence analysis for synchronous requests
3. **Automatic Confidence Analysis** - Analyzes all AI responses and escalates when uncertain
4. **Per-Tenant Configuration** - Each tenant can configure escalation thresholds via dashboard

---

## Architecture Overview

```
┌─────────────┐
│  Webhooks   │ (WhatsApp, Messenger)
└──────┬──────┘
       │ Publishes to RabbitMQ
       ▼
┌─────────────┐
│  RabbitMQ   │ (Message queues per tenant/channel)
└──────┬──────┘
       │ Consumed by
       ▼
┌─────────────┐
│   WORKER    │ ◄── NEW!
│  Process    │ Uses MessagePipelineWithEscalation
└─────────────┘ Analyzes confidence & escalates


┌─────────────┐
│ Web Chat API│ (Direct REST endpoint)
└──────┬──────┘
       │ Direct processing
       ▼
┌─────────────┐
│ Confidence  │ Integrated into /api/chat
│  Analysis   │ Analyzes & escalates
└─────────────┘
```

---

## Deployment Steps

### 1. Build All Packages

```bash
cd /home/deploy/meta-chat-platform

# Build all packages
npm run build
```

This will build:
- `@meta-chat/shared`
- `@meta-chat/orchestrator` (with confidence escalation)
- `@meta-chat/api` (with integrated confidence analysis)
- `@meta-chat/worker` (NEW - async message processor)

### 2. Deploy to PM2

The `ecosystem.config.js` has been updated to include the worker:

```bash
# Stop current processes
pm2 stop meta-chat-api

# Start both API and Worker
pm2 reload ecosystem.config.js

# Verify both are running
pm2 list
```

You should see:
```
┌────┬──────────────────┬─────────┬─────────┬──────────┐
│ id │ name             │ status  │ cpu     │ memory   │
├────┼──────────────────┼─────────┼─────────┼──────────┤
│ 0  │ meta-chat-api    │ online  │ 0%      │ 91.6mb   │
│ 1  │ meta-chat-worker │ online  │ 0%      │ 85.2mb   │
└────┴──────────────────┴─────────┴─────────┴──────────┘
```

### 3. Configure Metrica Tenant

Now enable confidence escalation for the Metrica tenant:

#### Option A: Via Dashboard UI (Recommended - 5 minutes)

1. Go to https://chat.genai.hr
2. Navigate to **Tenants** → **Metrica** → **Settings**
3. Enable **"Human Handoff"**
4. Enable **"Confidence-Based Escalation"**
5. Select Mode: **Standard** (recommended)
6. **Save Settings**

#### Option B: Via Configuration Script

```bash
cd /home/deploy/meta-chat-platform

# Run configuration script
npx tsx scripts/configure-metrica-confidence.ts
```

This will:
- Find or create the Metrica tenant
- Enable confidence escalation with standard mode
- Set thresholds: <30% immediate escalation, <60% suggest review

---

## Configuration Options

### Environment Variables for Worker

The worker can be configured via environment variables in `ecosystem.config.js`:

```javascript
{
  ENABLE_CONFIDENCE_ESCALATION: 'true',  // Global feature flag
  WORKER_VISIBILITY_TIMEOUT_MS: '300000',  // 5 minutes
  WORKER_MAX_RETRIES: '3',
  WORKER_PREFETCH: '5',  // Messages to prefetch
}
```

### Per-Tenant Settings

Each tenant can configure in Dashboard UI:

- **Mode**: Lenient (20%), Standard (30%), Strict (50%)
- **Self-Assessment Strategy**: Explicit markers, Chain-of-thought, etc.
- **Disclaimers**: Add warning messages to uncertain responses
- **Custom Thresholds**: Fine-tune escalation points
- **High-Stakes Domains**: Add custom keywords (e.g., "prescription", "legal advice")

---

## Monitoring

### Check PM2 Logs

```bash
# View worker logs
pm2 logs meta-chat-worker

# View API logs
pm2 logs meta-chat-api

# View both
pm2 logs
```

### Check for Escalation Events

Query the database for escalation events:

```sql
SELECT
  e.created_at,
  e.tenant_id,
  e.conversation_id,
  e.data->>'reason' as reason,
  e.data->>'confidenceScore' as score,
  e.data->>'confidenceLevel' as level
FROM events e
WHERE
  e.type = 'human_handoff.requested'
  AND e.data->>'reason' = 'low_confidence'
ORDER BY e.created_at DESC
LIMIT 20;
```

### Monitor Escalation Rate

```sql
-- Escalation rate by tenant (last 24 hours)
SELECT
  t.name as tenant,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT CASE WHEN e.type = 'human_handoff.requested' THEN m.id END) as escalated,
  ROUND(
    COUNT(DISTINCT CASE WHEN e.type = 'human_handoff.requested' THEN m.id END)::numeric /
    NULLIF(COUNT(DISTINCT m.id), 0) * 100,
    2
  ) as escalation_rate_pct
FROM tenants t
LEFT JOIN conversations c ON c.tenant_id = t.id
LEFT JOIN messages m ON m.conversation_id = c.id AND m.created_at > NOW() - INTERVAL '24 hours'
LEFT JOIN events e ON e.conversation_id = c.id AND e.created_at > NOW() - INTERVAL '24 hours'
GROUP BY t.name
ORDER BY escalation_rate_pct DESC;
```

---

## Testing

### Test Webchat Confidence Escalation

```bash
# Test with a low-confidence query
curl -X POST https://chat.genai.hr/api/chat \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "metrica-tenant-id",
    "message": "What specific medication should I take for my rare condition?"
  }'
```

Expected response metadata:
```json
{
  "metadata": {
    "confidenceEscalation": {
      "enabled": true,
      "escalated": true,
      "action": "IMMEDIATE_ESCALATION",
      "confidenceScore": 0.25,
      "confidenceLevel": "LOW"
    }
  }
}
```

### Test Worker Processing

1. Send a WhatsApp/Messenger message to a configured tenant
2. Check worker logs: `pm2 logs meta-chat-worker`
3. Verify message was processed with confidence analysis
4. Check database for escalation events

---

## Rollback Plan

If issues arise, you can disable confidence escalation:

### Quick Disable (Keep Worker Running)

Set environment variable:
```bash
# In ecosystem.config.js, change:
ENABLE_CONFIDENCE_ESCALATION: 'false'

# Then reload
pm2 reload ecosystem.config.js
```

### Full Rollback (Remove Worker)

```bash
# Stop and delete worker process
pm2 stop meta-chat-worker
pm2 delete meta-chat-worker

# Keep only API running
pm2 restart meta-chat-api
```

The API will continue to work without the worker. Webhook messages will queue in RabbitMQ until the worker is restarted.

---

## Performance Impact

### Expected Resource Usage

- **Worker Process**: ~85-150 MB RAM, <5% CPU (idle)
- **API Process**: Additional ~10-20 MB RAM for confidence analysis
- **Network**: Minimal - confidence analysis runs in-process

### Latency Impact

- **Webchat**: +50-150ms per request (confidence analysis)
- **Async Messages**: No user-facing impact (processed in background)

---

## Troubleshooting

### Worker Not Starting

Check logs:
```bash
pm2 logs meta-chat-worker --lines 50
```

Common issues:
- ❌ Missing DATABASE_URL → Check ecosystem.config.js
- ❌ Missing RABBITMQ_URL → Check ecosystem.config.js
- ❌ No tenants found → Worker will start but wait for tenant config

### No Escalations Happening

1. **Check if enabled for tenant**:
   ```sql
   SELECT name, settings->'confidenceEscalation' FROM tenants;
   ```

2. **Check worker logs** for confidence scores
3. **Test with obvious low-confidence query** (medical, legal advice)
4. **Check thresholds** - maybe they're too low

### Too Many Escalations

1. **Adjust mode** from Strict → Standard → Lenient
2. **Increase thresholds** in tenant settings
3. **Disable disclaimers** if they're being added too often

---

## Next Steps

1. ✅ **Deploy** - Follow deployment steps above
2. ✅ **Configure Metrica** - Enable via dashboard
3. ✅ **Monitor** - Watch logs and escalation events for 24 hours
4. 📊 **Tune** - Adjust thresholds based on escalation rate
5. 🚀 **Roll out** - Enable for other tenants gradually

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| **Worker Process** | NEW - Consumes RabbitMQ messages | Enables async message processing with confidence |
| **API /chat Endpoint** | Integrated confidence analysis | Webchat gets confidence escalation |
| **Orchestrator Package** | Added 5 new files | Confidence analyzer, escalation engine, etc. |
| **Shared Types** | Added `confidenceEscalation` to `TenantSettings` | Per-tenant configuration |
| **Dashboard UI** | Added confidence config section | Tenant admins can configure |
| **PM2 Config** | Added worker process | Runs alongside API |

---

## Documentation

For more details, see:
- `CONFIDENCE-ESCALATION-SETUP-SUMMARY.md` - Setup instructions
- `CONFIDENCE-ESCALATION-QUICK-START.md` - Quick reference
- `docs/confidence-based-escalation-guide.md` - Complete guide
- `docs/per-tenant-confidence-configuration.md` - Configuration details

---

**Ready to deploy!** 🚀
