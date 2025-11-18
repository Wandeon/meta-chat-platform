# Confidence Escalation Quick Start

## ✨ What Is This?

**Intelligent human escalation based on AI confidence, not keywords.**

Instead of "speak to human" → escalate, the LLM analyzes **how certain it is** about its response and escalates when unsure.

---

## 🚀 Enable Per-Tenant in 3 Steps

### Step 1: Update Tenant Settings (API or Database)

```bash
# Via API
curl -X PATCH https://your-api.com/api/tenants/tenant-123 \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "confidenceEscalation": {
        "enabled": true,
        "mode": "standard"
      }
    }
  }'
```

```typescript
// Via Prisma
await prisma.tenant.update({
  where: { id: 'tenant-123' },
  data: {
    settings: {
      confidenceEscalation: {
        enabled: true,
        mode: 'standard', // or 'strict', 'lenient'
      },
    },
  },
});
```

### Step 2: Use Enhanced Pipeline

```typescript
import { MessagePipelineWithEscalation } from '@meta-chat/orchestrator';

const pipeline = new MessagePipelineWithEscalation({
  tenantId: 'tenant-123',
  channel: 'whatsapp',
  channelAdapters: registry,
  enableConfidenceEscalation: true, // ← Global feature flag
});

await pipeline.process(message);
// Escalation happens automatically based on tenant settings!
```

### Step 3: Done!

That's it. The pipeline will:
1. ✅ Read tenant's confidence settings from database
2. ✅ Add confidence instructions to prompts
3. ✅ Analyze LLM response confidence
4. ✅ Escalate to human if confidence is low

---

## 🎛️ Configuration Options

### Modes (Quick Presets)

| Mode | Use Case | Immediate Threshold | Review Threshold |
|------|----------|---------------------|------------------|
| **strict** | Medical, Legal, Financial | 50% | 75% |
| **standard** | General Support | 30% | 60% |
| **lenient** | Casual Chat | 20% | 40% |

### Full Configuration

```typescript
{
  confidenceEscalation: {
    // Basic
    enabled: true,
    mode: 'standard',

    // Advanced (optional)
    immediateEscalationThreshold: 0.3, // <30% = don't send AI response
    suggestReviewThreshold: 0.6, // <60% = send + notify human
    addDisclaimers: true, // Add warnings to uncertain responses
    disclaimerText: 'Custom disclaimer here',
    selfAssessmentStrategy: 'explicit_marker', // or 'chain_of_thought'
    highStakesDomains: ['prescription', 'legal'], // Extra keywords
  }
}
```

---

## 📖 Examples

### Medical Tenant (Strict)

```typescript
await prisma.tenant.update({
  where: { id: 'medical-bot' },
  data: {
    settings: {
      confidenceEscalation: {
        enabled: true,
        mode: 'strict',
        disclaimerText: '⚠️ Consult a healthcare professional.',
        highStakesDomains: ['medication', 'surgery'],
      },
    },
  },
});
```

**Result:**
```
User: "What medication should I take?"
AI: "I cannot provide medical advice. [confidence: very_low]"

Analysis:
  Confidence: 15% (VERY_LOW)
  Action: IMMEDIATE_ESCALATION
  Send AI Response: ❌
  Notify Human: 🚨 YES
```

### E-commerce (Standard)

```typescript
await prisma.tenant.update({
  where: { id: 'shop-bot' },
  data: {
    settings: {
      confidenceEscalation: {
        enabled: true,
        mode: 'standard',
      },
    },
  },
});
```

**Result:**
```
User: "What's your return policy?"
AI: "You can return items within 30 days."

Analysis:
  Confidence: 92% (HIGH)
  Action: CONTINUE
  Send AI Response: ✅
  Notify Human: ✅ NO
```

### Casual Chat (Lenient)

```typescript
await prisma.tenant.update({
  where: { id: 'chat-bot' },
  data: {
    settings: {
      confidenceEscalation: {
        enabled: true,
        mode: 'lenient',
        addDisclaimers: false,
      },
    },
  },
});
```

---

## 🔧 Configuration Script

Use the example script to configure multiple tenants:

```bash
npx tsx examples/configure-tenant-escalation.ts
```

This will set up:
- Medical tenants → Strict mode
- Legal tenants → Strict mode
- Support tenants → Standard mode
- Chat tenants → Lenient mode

---

## 📊 Monitoring

### Listen to Escalation Events

```typescript
import { EventType } from '@meta-chat/shared';
import { getEventManager } from '@meta-chat/events';

const eventManager = getEventManager();

eventManager.on(EventType.HUMAN_HANDOFF_REQUESTED, (event) => {
  const { reason, confidenceScore, confidenceLevel } = event.data;

  if (reason === 'low_confidence') {
    console.log('Confidence escalation:', {
      tenant: event.tenantId,
      conversation: event.data.conversationId,
      score: confidenceScore,
      level: confidenceLevel,
    });

    // Send to analytics
    analytics.track('confidence_escalation', event.data);
  }
});
```

### Check Escalation Rates

```sql
-- Per-tenant escalation rate
SELECT
  t.name,
  COUNT(CASE WHEN e.data->>'reason' = 'low_confidence' THEN 1 END) as confidence_escalations,
  COUNT(m.id) as total_messages,
  ROUND(
    COUNT(CASE WHEN e.data->>'reason' = 'low_confidence' THEN 1 END)::numeric /
    NULLIF(COUNT(m.id), 0) * 100,
    2
  ) as escalation_rate_pct
FROM tenants t
LEFT JOIN messages m ON m.tenant_id = t.id
LEFT JOIN events e ON e.tenant_id = t.id AND e.type = 'human_handoff.requested'
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY t.name;
```

---

## 🎯 How It Works

### Behind the Scenes

```
1. User sends message
         ↓
2. Pipeline loads tenant settings from database
         ↓
3. If enabled, adds confidence instructions to prompt
         ↓
4. LLM responds with [confidence: medium] tag
         ↓
5. Analyzer checks:
   ✓ Self-assessment tag
   ✓ Hedging phrases ("I'm not sure")
   ✓ Response quality
   ✓ Domain (medical/legal?)
         ↓
6. Engine decides:
   - High confidence (>60%) → Send normally
   - Medium (40-60%) → Send with disclaimer
   - Low (<40%) → Send + notify human
   - Very low (<30%) → Don't send, escalate immediately
```

### Confidence Signals

The analyzer looks at:
- **Self-assessment**: `[confidence: low]` tags
- **Hedging**: "I'm not sure", "might be", "perhaps"
- **Quality**: Response completeness, specificity
- **Domain**: Medical/legal triggers stricter thresholds

---

## 📚 Documentation

- **Complete Guide**: `docs/confidence-based-escalation-guide.md`
- **Per-Tenant Config**: `docs/per-tenant-confidence-configuration.md`
- **API Reference**: `docs/CONFIDENCE-ESCALATION-README.md`

---

## 🧪 Testing

Run the demo to see it in action:

```bash
npx tsx examples/confidence-escalation-demo.ts
```

Output:
```
📝 Example 1: High Confidence FAQ
User: What are your business hours?
AI: Our business hours are Monday through Friday, 9 AM to 5 PM EST.

Analysis:
  Confidence Level: HIGH
  Confidence Score: 87.5%
  Escalation Action: CONTINUE
  Send AI Response: ✅
  Notify Human: ✅ NO
```

---

## 🎛️ Dashboard Integration

Add to your tenant settings UI:

```jsx
<section>
  <h3>Confidence-Based Escalation</h3>

  <label>
    <input type="checkbox" {...register('confidenceEscalation.enabled')} />
    Enable intelligent escalation
  </label>

  <select {...register('confidenceEscalation.mode')}>
    <option value="lenient">Lenient - Trust AI more</option>
    <option value="standard">Standard - Balanced</option>
    <option value="strict">Strict - Escalate more often</option>
  </select>

  <label>
    <input type="checkbox" {...register('confidenceEscalation.addDisclaimers')} />
    Add disclaimers to uncertain responses
  </label>

  <textarea
    placeholder="Custom disclaimer text"
    {...register('confidenceEscalation.disclaimerText')}
  />
</section>
```

---

## 🚀 Migration

### Gradual Rollout

**Week 1**: Enable for 10% of tenants
```typescript
const pilotTenants = ['tenant-1', 'tenant-2', 'tenant-3'];
for (const id of pilotTenants) {
  await enableConfidenceEscalation(id, 'standard');
}
```

**Week 2**: Monitor metrics, adjust thresholds

**Week 3**: Expand to 50% if metrics good

**Week 4**: Full rollout

### Feature Flags

```typescript
const CONFIDENCE_ESCALATION_ENABLED = process.env.CONFIDENCE_ESCALATION_ENABLED === 'true';

const pipeline = new MessagePipelineWithEscalation({
  tenantId,
  channel,
  channelAdapters: registry,
  enableConfidenceEscalation: CONFIDENCE_ESCALATION_ENABLED,
});
```

---

## ❓ FAQ

### Q: Does this replace keyword-based escalation?
**A:** No! It complements it. Keywords are checked first, then confidence analysis happens.

### Q: What if a tenant doesn't configure it?
**A:** It's disabled by default. Existing behavior unchanged.

### Q: Can I configure it per-channel?
**A:** Not yet, but you can enable/disable per-tenant.

### Q: Does it cost more tokens?
**A:** Minimal - about 50-100 extra tokens per request for the confidence instructions.

### Q: Can I use different modes for different conversation types?
**A:** Not yet, but you can set domain-specific keywords for stricter thresholds.

---

## 🎉 Summary

**Enable confidence-based escalation in 3 lines:**

```typescript
// 1. Update tenant settings
await prisma.tenant.update({
  where: { id: 'tenant-123' },
  data: { settings: { confidenceEscalation: { enabled: true, mode: 'standard' } } },
});

// 2. Use enhanced pipeline
const pipeline = new MessagePipelineWithEscalation({ tenantId, channel, channelAdapters, enableConfidenceEscalation: true });

// 3. Done!
await pipeline.process(message);
```

**Benefits:**
- ✅ Smarter escalation (not just keywords)
- ✅ Per-tenant configuration
- ✅ Domain-aware (medical, legal)
- ✅ Fully customizable thresholds
- ✅ No code changes needed

**Get Started:**
```bash
npx tsx examples/configure-tenant-escalation.ts
npx tsx examples/confidence-escalation-demo.ts
```
