# Per-Tenant Confidence Escalation Configuration

## Overview

The confidence-based escalation system can be configured **per-tenant** via the tenant settings in the database. This allows you to:

- Enable/disable for specific tenants
- Use different modes (strict, standard, lenient) per tenant
- Customize thresholds per tenant
- Add tenant-specific high-stakes domains

---

## Configuration Structure

The confidence escalation settings are stored in the `settings` JSON field of the `Tenant` model:

```typescript
interface TenantSettings {
  // ... other settings
  confidenceEscalation?: {
    enabled: boolean;
    mode: 'standard' | 'strict' | 'lenient';
    immediateEscalationThreshold?: number; // 0-1
    suggestReviewThreshold?: number; // 0-1
    addDisclaimers?: boolean;
    disclaimerText?: string;
    selfAssessmentStrategy?: 'explicit_marker' | 'chain_of_thought' | 'uncertainty_acknowledgment';
    highStakesDomains?: string[];
  };
}
```

---

## Examples

### Example 1: Enable Standard Mode for a Tenant

```typescript
// Update tenant settings via API or database
await prisma.tenant.update({
  where: { id: 'tenant-123' },
  data: {
    settings: {
      // ... other settings
      confidenceEscalation: {
        enabled: true,
        mode: 'standard',
      },
    },
  },
});
```

**Result:**
- Immediate escalation threshold: 30%
- Suggest review threshold: 60%
- Standard domain rules apply

---

### Example 2: Strict Mode for Medical/Legal Tenants

```typescript
await prisma.tenant.update({
  where: { id: 'medical-tenant-456' },
  data: {
    settings: {
      brandName: 'HealthBot',
      confidenceEscalation: {
        enabled: true,
        mode: 'strict', // Higher thresholds
        disclaimerText: '\n\n⚠️ This information is general in nature. Always consult with a licensed healthcare provider.',
        highStakesDomains: ['prescription', 'surgery', 'emergency'],
      },
    },
  },
});
```

**Result:**
- Immediate escalation threshold: 50%
- Suggest review threshold: 75%
- Custom disclaimer added
- Additional high-stakes keywords

---

### Example 3: Lenient Mode for Casual Chat

```typescript
await prisma.tenant.update({
  where: { id: 'casual-chat-789' },
  data: {
    settings: {
      brandName: 'FriendlyBot',
      tone: 'casual',
      confidenceEscalation: {
        enabled: true,
        mode: 'lenient', // Lower thresholds
        addDisclaimers: false, // Don't add disclaimers
      },
    },
  },
});
```

**Result:**
- Immediate escalation threshold: 20%
- Suggest review threshold: 40%
- No disclaimers added

---

### Example 4: Custom Thresholds

```typescript
await prisma.tenant.update({
  where: { id: 'custom-tenant-999' },
  data: {
    settings: {
      confidenceEscalation: {
        enabled: true,
        mode: 'standard',
        // Override defaults with custom thresholds
        immediateEscalationThreshold: 0.35, // 35% instead of 30%
        suggestReviewThreshold: 0.7, // 70% instead of 60%
        selfAssessmentStrategy: 'chain_of_thought', // Different strategy
      },
    },
  },
});
```

---

### Example 5: Disable for Specific Tenant

```typescript
await prisma.tenant.update({
  where: { id: 'no-escalation-tenant' },
  data: {
    settings: {
      // Explicitly disable
      confidenceEscalation: {
        enabled: false,
      },
      // Or omit entirely (defaults to disabled)
    },
  },
});
```

---

## REST API Integration

### Update Tenant Settings

```bash
PATCH /api/tenants/:tenantId
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "settings": {
    "confidenceEscalation": {
      "enabled": true,
      "mode": "strict",
      "disclaimerText": "Custom disclaimer here"
    }
  }
}
```

### Dashboard Integration

The dashboard should include a UI section for confidence escalation:

```typescript
// In your tenant settings form
<section>
  <h3>Confidence-Based Escalation</h3>

  <label>
    <input type="checkbox" name="confidenceEscalation.enabled" />
    Enable confidence-based escalation
  </label>

  <select name="confidenceEscalation.mode">
    <option value="lenient">Lenient (Trust AI more)</option>
    <option value="standard" selected>Standard (Balanced)</option>
    <option value="strict">Strict (Escalate more often)</option>
  </select>

  <label>
    Immediate Escalation Threshold:
    <input type="range" min="0" max="1" step="0.05"
           name="confidenceEscalation.immediateEscalationThreshold" />
  </label>

  <label>
    Suggest Review Threshold:
    <input type="range" min="0" max="1" step="0.05"
           name="confidenceEscalation.suggestReviewThreshold" />
  </label>

  <label>
    <input type="checkbox" name="confidenceEscalation.addDisclaimers" checked />
    Add disclaimers to uncertain responses
  </label>

  <label>
    Custom Disclaimer Text:
    <textarea name="confidenceEscalation.disclaimerText"></textarea>
  </label>

  <label>
    Self-Assessment Strategy:
    <select name="confidenceEscalation.selfAssessmentStrategy">
      <option value="explicit_marker" selected>Explicit Marker</option>
      <option value="chain_of_thought">Chain of Thought</option>
      <option value="uncertainty_acknowledgment">Uncertainty Acknowledgment</option>
    </select>
  </label>

  <label>
    Additional High-Stakes Domains (comma-separated):
    <input type="text" name="confidenceEscalation.highStakesDomains"
           placeholder="e.g., prescription, surgery" />
  </label>
</section>
```

---

## How It Works

### 1. Pipeline Initialization

```typescript
// Create pipeline (globally or per-channel)
const pipeline = new MessagePipelineWithEscalation({
  tenantId: 'tenant-123',
  channel: 'whatsapp',
  channelAdapters: registry,
  enableConfidenceEscalation: true, // Global feature flag
});
```

### 2. Per-Message Processing

When a message is processed:

1. **Fetch tenant settings** from cache/database
2. **Check if enabled** for this tenant: `settings.confidenceEscalation?.enabled`
3. **Build config** from tenant settings using preset mode + overrides
4. **Update engine** with tenant-specific config
5. **Process message** with tenant's escalation rules

```typescript
// Automatically handled inside MessagePipelineWithEscalation.process()
const config = await this.tenantCache.get(tenantId, channel);

if (config.settings.confidenceEscalation?.enabled) {
  const tenantConfig = buildEscalationConfigFromTenant(config.settings);
  escalationEngine.updateConfig(tenantConfig);
}
```

### 3. Dynamic Per-Request

The configuration is **dynamic per request**:
- Tenant A's message → Uses Tenant A's settings
- Tenant B's message → Uses Tenant B's settings
- No shared state between tenants

---

## Mode Presets

### Standard Mode (Default)

**Best for:** General customer support, FAQ bots

| Threshold | Value |
|-----------|-------|
| Immediate Escalation | 30% |
| Suggest Review | 60% |
| High Stakes | 80% |
| Standard | 60% |
| Low Stakes | 40% |

### Strict Mode

**Best for:** Medical, legal, financial domains

| Threshold | Value |
|-----------|-------|
| Immediate Escalation | 50% |
| Suggest Review | 75% |
| High Stakes | 85% |
| Standard | 70% |
| Low Stakes | 50% |

### Lenient Mode

**Best for:** Casual chat, entertainment bots

| Threshold | Value |
|-----------|-------|
| Immediate Escalation | 20% |
| Suggest Review | 40% |
| High Stakes | 70% |
| Standard | 50% |
| Low Stakes | 30% |

---

## Migration Guide

### Step 1: Identify Tenant Categories

```typescript
const tenantCategories = {
  medical: ['tenant-health-1', 'tenant-medical-2'],
  legal: ['tenant-law-1'],
  standard: ['tenant-support-1', 'tenant-faq-2'],
  casual: ['tenant-chat-1'],
};
```

### Step 2: Bulk Update Settings

```typescript
// Enable strict mode for medical tenants
for (const tenantId of tenantCategories.medical) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...existingSettings,
        confidenceEscalation: {
          enabled: true,
          mode: 'strict',
        },
      },
    },
  });
}

// Enable standard mode for others
for (const tenantId of tenantCategories.standard) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...existingSettings,
        confidenceEscalation: {
          enabled: true,
          mode: 'standard',
        },
      },
    },
  });
}
```

### Step 3: Gradual Rollout

Enable for a subset first, monitor metrics, then expand:

```typescript
// Week 1: Enable for 10% of tenants
const enabledTenants = allTenants.slice(0, Math.floor(allTenants.length * 0.1));

// Week 2: Enable for 50% if metrics look good
// Week 3: Enable for 100%
```

---

## Monitoring Per-Tenant Metrics

### Track Escalation Rates

```typescript
eventManager.on(EventType.HUMAN_HANDOFF_REQUESTED, async (event) => {
  const { tenantId, reason, confidenceScore } = event;

  if (reason === 'low_confidence') {
    await metrics.increment('escalations.by_tenant', { tenantId });
    await metrics.histogram('confidence_scores.by_tenant', confidenceScore, { tenantId });
  }
});
```

### Dashboard Metrics

Display per-tenant:
- Total escalations
- Escalation rate (escalations / total messages)
- Average confidence score
- Distribution of actions (CONTINUE, SUGGEST_REVIEW, IMMEDIATE_ESCALATION)

### Example Query

```sql
-- Escalation rate per tenant
SELECT
  t.id,
  t.name,
  COUNT(CASE WHEN e.type = 'human_handoff.requested' THEN 1 END) as escalations,
  COUNT(m.id) as total_messages,
  ROUND(
    COUNT(CASE WHEN e.type = 'human_handoff.requested' THEN 1 END)::numeric /
    NULLIF(COUNT(m.id), 0) * 100,
    2
  ) as escalation_rate_pct
FROM tenants t
LEFT JOIN messages m ON m.tenant_id = t.id
LEFT JOIN events e ON e.tenant_id = t.id
  AND e.type = 'human_handoff.requested'
  AND e.data->>'reason' = 'low_confidence'
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY t.id, t.name
ORDER BY escalation_rate_pct DESC;
```

---

## Testing Per-Tenant Config

```typescript
import { MessagePipelineWithEscalation } from '@meta-chat/orchestrator';

describe('Per-Tenant Confidence Escalation', () => {
  it('should use strict mode for medical tenant', async () => {
    // Setup medical tenant
    await prisma.tenant.update({
      where: { id: 'medical-tenant' },
      data: {
        settings: {
          confidenceEscalation: { enabled: true, mode: 'strict' },
        },
      },
    });

    const pipeline = new MessagePipelineWithEscalation({
      tenantId: 'medical-tenant',
      channel: 'whatsapp',
      channelAdapters: registry,
    });

    await pipeline.process(medicalQuery);

    // Assert stricter thresholds were applied
    expect(escalationRate).toBeGreaterThan(standardEscalationRate);
  });

  it('should disable for opted-out tenant', async () => {
    await prisma.tenant.update({
      where: { id: 'opted-out-tenant' },
      data: {
        settings: {
          confidenceEscalation: { enabled: false },
        },
      },
    });

    const pipeline = new MessagePipelineWithEscalation({
      tenantId: 'opted-out-tenant',
      channel: 'whatsapp',
      channelAdapters: registry,
    });

    await pipeline.process(message);

    // No confidence escalation should occur
    expect(confidenceAnalysisRan).toBe(false);
  });
});
```

---

## Best Practices

### 1. Start Conservative

Begin with strict mode, then relax based on feedback:

```typescript
// Initial rollout
confidenceEscalation: {
  enabled: true,
  mode: 'strict', // Start strict
}

// After 2 weeks of monitoring
confidenceEscalation: {
  enabled: true,
  mode: 'standard', // Relax if false positives are high
}
```

### 2. Domain-Specific Defaults

Set smart defaults based on tenant industry:

```typescript
function getDefaultEscalationMode(industry: string): string {
  const modeMap = {
    medical: 'strict',
    legal: 'strict',
    financial: 'strict',
    education: 'standard',
    retail: 'standard',
    entertainment: 'lenient',
  };
  return modeMap[industry] || 'standard';
}
```

### 3. A/B Testing

Test different configurations:

```typescript
const variant = tenantId.hashCode() % 2; // Deterministic split

confidenceEscalation: {
  enabled: true,
  mode: variant === 0 ? 'standard' : 'strict',
}
```

### 4. Feedback Loop

Allow agents to flag unnecessary escalations:

```typescript
// Agent marks escalation as unnecessary
async function recordFalsePositive(conversationId: string) {
  const conversation = await getConversation(conversationId);
  const analysis = conversation.metadata.confidenceAnalysis;

  if (analysis.overallScore > 0.5) {
    // Score was reasonable but we escalated - threshold too high
    logger.warn('Potential false positive escalation', {
      tenantId: conversation.tenantId,
      score: analysis.overallScore,
      threshold: getCurrentThreshold(conversation.tenantId),
    });
  }
}
```

---

## Summary

**Confidence-based escalation is fully per-tenant configurable:**

✅ **Enable/disable** per tenant
✅ **Choose mode** (strict/standard/lenient)
✅ **Custom thresholds** per tenant
✅ **Custom disclaimers** per tenant
✅ **Domain-specific rules** per tenant
✅ **Dynamic configuration** - no restarts needed
✅ **Cached** - performance optimized

**Configuration is stored in:**
- Database: `tenants.settings.confidenceEscalation`
- Cached: 5-minute TTL (configurable)
- Applied: Dynamically per message

**No code changes needed** - just update tenant settings via API or dashboard!
