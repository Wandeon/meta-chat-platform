# Confidence Escalation - Deployment Status

**Deployment Date**: 2025-10-11 00:44 UTC
**Status**: ✅ **FULLY DEPLOYED AND OPERATIONAL**

---

## ✅ Deployment Completed

All components have been successfully built, deployed, and configured.

### 1. Build Status
```
✅ All 11 packages built successfully
   - @meta-chat/shared
   - @meta-chat/database
   - @meta-chat/orchestrator (with confidence escalation)
   - @meta-chat/channels
   - @meta-chat/events
   - @meta-chat/rag
   - @meta-chat/llm
   - @meta-chat/api (with integrated confidence)
   - @meta-chat/worker (NEW)
   - @meta-chat/dashboard
   - @meta-chat/web-widget

Build Time: 16.357s
Cache: 2 cached, 11 total
```

### 2. PM2 Deployment
```
✅ Both processes running successfully

┌────┬─────────────────────┬─────────┬──────────┐
│ id │ name                │ status  │ memory   │
├────┼─────────────────────┼─────────┼──────────┤
│ 0  │ meta-chat-api       │ online  │ 113.5mb  │
│ 1  │ meta-chat-worker    │ online  │  92.0mb  │ ← NEW!
└────┴─────────────────────┴─────────┴──────────┘

Uptime: 4+ minutes
Restarts: API (21 total), Worker (0 - first deploy)
```

### 3. Worker Status
```
✅ Worker successfully started and processing

Discovered Tenants:
  - Test Tenant (cmgjo6rpc0000g6diraspum3w)
    └─ Channels: webchat ✓

  - Metrica (cmgjuow6q0000g5jwvwyopzk6)
    └─ Channels: webchat ✓

Queue Consumers: 2 active
Status: Running and processing messages
```

### 4. Metrica Tenant Configuration
```
✅ Confidence escalation enabled and configured

Tenant ID: cmgjuow6q0000g5jwvwyopzk6
Settings:
  └─ enableHumanHandoff: true
  └─ confidenceEscalation:
      ├─ enabled: true
      ├─ mode: standard
      ├─ addDisclaimers: true
      └─ selfAssessmentStrategy: explicit_marker

Thresholds (Standard Mode):
  - Immediate Escalation: <30% confidence
  - Suggest Review: <60% confidence
  - High-Stakes Domains: medical, legal, financial
```

### 5. System Health
```
✅ All services healthy

{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up",
    "rabbitmq": "up"
  }
}

API Endpoint: http://localhost:3000
Dashboard: https://chat.genai.hr
```

---

## 📊 What's Running

### API Process (meta-chat-api)
- **Purpose**: REST API for dashboard and webchat
- **Port**: 3000
- **Features**:
  - ✅ Integrated confidence analysis in /api/chat endpoint
  - ✅ Analyzes all webchat responses
  - ✅ Creates escalation events when confidence < 30%
  - ✅ Adds disclaimers for medium confidence
  - ✅ Updates conversation status on escalation

### Worker Process (meta-chat-worker) - NEW!
- **Purpose**: Async message processing from RabbitMQ
- **Channels**: WhatsApp, Messenger, Webchat (queued messages)
- **Features**:
  - ✅ Consumes messages from RabbitMQ queues
  - ✅ Uses MessagePipelineWithEscalation
  - ✅ Auto-discovers enabled tenants
  - ✅ Confidence analysis on all async messages
  - ✅ Automatic escalation when uncertain

---

## 🔧 How It Works Now

### Synchronous Flow (Webchat via API)
```
User → POST /api/chat → LLM Response → Confidence Analysis
                                              ↓
                                    [If <30% confidence]
                                              ↓
                                    Create escalation event
                                    Update conversation status
                                    Notify human support
```

### Asynchronous Flow (WhatsApp/Messenger)
```
Webhook → RabbitMQ Queue → Worker Process → MessagePipeline
                                                    ↓
                                            Confidence Analysis
                                                    ↓
                                          [If <30% confidence]
                                                    ↓
                                            Escalate to human
```

---

## 🎯 Configuration

### Per-Tenant Control
Admins can configure via Dashboard UI:
- **Tenant Settings** → **Features** → **Human Handoff**
  - Enable "Human Handoff"
  - Enable "Confidence-Based Escalation"
  - Choose Mode: Lenient / Standard / Strict
  - Configure disclaimers, thresholds, domains

### Environment Variables
```bash
# In ecosystem.config.js

# Worker Configuration
ENABLE_CONFIDENCE_ESCALATION='true'    # Global feature flag
WORKER_VISIBILITY_TIMEOUT_MS='300000'  # 5 minutes
WORKER_MAX_RETRIES='3'
WORKER_PREFETCH='5'

# Both processes
DATABASE_URL='postgresql://...'
RABBITMQ_URL='amqp://...'
```

---

## 📈 Monitoring

### Check Worker Logs
```bash
pm2 logs meta-chat-worker
```

### Check API Logs
```bash
pm2 logs meta-chat-api
```

### Query Escalation Events
```sql
SELECT
  created_at,
  conversation_id,
  data->>'confidenceScore' as score,
  data->>'confidenceLevel' as level,
  data->>'reason' as reason
FROM events
WHERE type = 'human_handoff.requested'
  AND data->>'reason' = 'low_confidence'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Escalation Rate
```sql
SELECT
  COUNT(*) FILTER (WHERE type = 'human_handoff.requested') as escalations,
  COUNT(DISTINCT conversation_id) as total_conversations,
  ROUND(
    COUNT(*) FILTER (WHERE type = 'human_handoff.requested')::numeric /
    NULLIF(COUNT(DISTINCT conversation_id), 0) * 100, 2
  ) as escalation_rate_pct
FROM events
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 🎓 Testing Recommendations

### Test 1: High Confidence (Should NOT escalate)
```
Message: "What are your business hours?"
Expected: Normal AI response, no escalation
```

### Test 2: Medium Confidence (Should add disclaimer)
```
Message: "How do I configure the advanced settings?"
Expected: AI response + disclaimer about human review
```

### Test 3: Low Confidence (Should escalate immediately)
```
Message: "What medication should I take for my condition?"
Expected:
  - Escalation event created
  - Conversation status → 'assigned_human'
  - Human support notified
  - No AI medical advice given
```

### Test 4: Uncertainty Detection
```
Message: "What's the exact regulation for this edge case?"
Expected: AI includes [confidence: low] → triggers escalation
```

---

## 📝 Next Steps

1. **Monitor for 24 hours**
   - Check escalation rates
   - Review escalation accuracy
   - Tune thresholds if needed

2. **Tune Configuration**
   - If too many escalations → Lower thresholds or switch to Lenient mode
   - If too few escalations → Raise thresholds or switch to Strict mode

3. **Roll Out to Other Tenants**
   - Enable Test Tenant if desired
   - Gradually enable for production tenants
   - Monitor each tenant's escalation rate

4. **Dashboard Metrics** (Future)
   - Add escalation rate chart
   - Show confidence distribution
   - Track false positives/negatives

---

## 🔄 Maintenance

### Restart Services
```bash
# Restart both
pm2 restart all

# Restart individually
pm2 restart meta-chat-api
pm2 restart meta-chat-worker
```

### View Status
```bash
pm2 list
pm2 monit  # Real-time monitoring
```

### Update Code
```bash
git pull origin master
npm run build
pm2 reload all
```

---

## 🚨 Troubleshooting

### Worker Not Processing Messages
1. Check RabbitMQ is running
2. Verify DATABASE_URL in ecosystem.config.js
3. Check worker logs: `pm2 logs meta-chat-worker`

### No Escalations Happening
1. Verify tenant has `confidenceEscalation.enabled: true`
2. Test with obvious low-confidence query (medical advice)
3. Check thresholds aren't too low

### Too Many Escalations
1. Switch from Strict → Standard → Lenient
2. Increase thresholds in tenant settings
3. Disable disclaimers if too aggressive

---

## ✨ Summary

**Status**: System is fully operational with confidence-based escalation

**Components Running**:
- ✅ API (with integrated confidence analysis)
- ✅ Worker (async message processing)
- ✅ Database
- ✅ Redis
- ✅ RabbitMQ

**Configuration**:
- ✅ Metrica tenant configured with Standard mode
- ✅ Test Tenant discovered (not yet configured)

**Ready For**:
- ✅ Production use
- ✅ Real-world testing
- ✅ Performance monitoring
- ✅ Threshold tuning

---

**Deployment completed successfully!** 🎉

For detailed documentation, see:
- `DEPLOYMENT-GUIDE.md` - Full deployment guide
- `CONFIDENCE-ESCALATION-SETUP-SUMMARY.md` - Setup summary
- `docs/confidence-based-escalation-guide.md` - Complete technical guide
