# Confidence Escalation Setup Summary

## ✅ What Was Done

### 1. UI Configuration Added
- **File**: `apps/dashboard/src/pages/TenantSettingsPage.tsx`
- **Added**: Complete UI section for confidence-based escalation settings
- **Location**: Under "Features" section, appears when "Enable Human Handoff" is checked

### 2. Features Available in UI

**Basic Settings:**
- ✅ Enable/Disable toggle for confidence escalation
- ✅ Mode selection: Lenient / Standard / Strict
- ✅ Self-Assessment Strategy selector
- ✅ Add Disclaimers toggle
- ✅ Custom Disclaimer Text field

**Advanced Settings** (collapsible):
- ✅ Immediate Escalation Threshold slider
- ✅ Suggest Review Threshold slider
- ✅ Additional High-Stakes Domains input

### 3. How to Configure Metrica Tenant

Since the UI is now ready, you can configure the Metrica tenant directly through the dashboard:

#### Step 1: Access Dashboard
1. Go to https://chat.genai.hr
2. Log in to the dashboard

#### Step 2: Navigate to Tenant Settings
1. Click on "Tenants" in the sidebar
2. Find "Metrica" tenant
3. Click "Settings" or the settings icon

#### Step 3: Enable Human Handoff
1. Scroll to the "Features" section
2. Check "Enable Human Handoff"

#### Step 4: Configure Confidence Escalation
1. The "🤖 Confidence-Based Escalation" section will appear
2. Check "Enable Confidence-Based Escalation"
3. Select Mode: **Standard** (recommended for general use)
4. Keep other settings as default or customize:
   - Self-Assessment Strategy: Explicit Marker
   - Add disclaimers: ✅ Checked
   - Custom disclaimer: (leave empty for default)

#### Step 5: Save
1. Scroll to bottom
2. Click "Save Settings"
3. Wait for success message

### 4. Recommended Settings for Metrica

```json
{
  "confidenceEscalation": {
    "enabled": true,
    "mode": "standard",
    "addDisclaimers": true,
    "selfAssessmentStrategy": "explicit_marker"
  }
}
```

**This configuration will:**
- Escalate when AI confidence is <30% (immediate)
- Suggest review when confidence is <60%
- Add disclaimers to uncertain responses
- Use explicit marker strategy for self-assessment

---

## 📋 Alternative: Configure via API

If you prefer to configure programmatically:

```bash
# Get tenant ID first
curl -H "Authorization: Bearer <admin-token>" \
  https://chat.genai.hr/api/tenants

# Update Metrica tenant
curl -X PATCH \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "enableHumanHandoff": true,
      "confidenceEscalation": {
        "enabled": true,
        "mode": "standard",
        "addDisclaimers": true,
        "selfAssessmentStrategy": "explicit_marker"
      }
    }
  }' \
  https://chat.genai.hr/api/tenants/<metrica-tenant-id>
```

---

## 🧪 Testing the Configuration

### Test 1: High Confidence Query
```
User: "What is your company name?"
Expected: AI responds normally, no escalation
```

### Test 2: Medium Confidence Query
```
User: "How do I configure the advanced settings?"
Expected: AI responds with disclaimer added
```

### Test 3: Low Confidence Query
```
User: "What specific medication should I take for my condition?"
Expected: AI detects medical domain + low confidence → immediate escalation
```

### Test 4: Explicit Uncertainty
```
User: "What's the exact regulation for this edge case?"
Expected: AI includes [confidence: low] tag → escalation triggered
```

---

## 📊 Monitoring

### Check Escalation Events

Monitor escalations in the logs or database:

```sql
SELECT
  e.created_at,
  e.data->>'reason' as reason,
  e.data->>'confidenceScore' as confidence,
  e.data->>'confidenceLevel' as level
FROM events e
WHERE
  e.type = 'human_handoff.requested'
  AND e.data->>'reason' = 'low_confidence'
ORDER BY e.created_at DESC
LIMIT 20;
```

### Dashboard Integration (Future)

Add a metrics page showing:
- Total escalations per day
- Escalation rate by tenant
- Average confidence scores
- Distribution of actions (CONTINUE, SUGGEST_REVIEW, IMMEDIATE_ESCALATION)

---

## 🎯 What Modes Do

| Mode | Immediate Threshold | Review Threshold | Best For |
|------|---------------------|------------------|----------|
| **Lenient** | 20% | 40% | Casual chat, entertainment |
| **Standard** | 30% | 60% | General support, FAQs |
| **Strict** | 50% | 75% | Medical, legal, financial |

---

## 📝 Files Created/Modified

### Core Implementation
- ✅ `packages/shared/src/types.ts` - Added `confidenceEscalation` to `TenantSettings`
- ✅ `packages/orchestrator/src/confidence-analyzer.ts` - Multi-signal analyzer
- ✅ `packages/orchestrator/src/confidence-prompt-builder.ts` - Prompt augmentation
- ✅ `packages/orchestrator/src/escalation-engine.ts` - Decision engine
- ✅ `packages/orchestrator/src/escalation-config-builder.ts` - Tenant config builder
- ✅ `packages/orchestrator/src/message-pipeline-with-escalation.ts` - Enhanced pipeline
- ✅ `packages/orchestrator/src/index.ts` - Exports

### UI
- ✅ `apps/dashboard/src/pages/TenantSettingsPage.tsx` - UI configuration section

### Documentation
- ✅ `docs/confidence-based-escalation-guide.md` - Complete guide
- ✅ `docs/per-tenant-confidence-configuration.md` - Per-tenant setup
- ✅ `docs/CONFIDENCE-ESCALATION-README.md` - Quick reference
- ✅ `CONFIDENCE-ESCALATION-QUICK-START.md` - Quick start guide
- ✅ `examples/confidence-escalation-demo.ts` - Interactive demo
- ✅ `examples/configure-tenant-escalation.ts` - Configuration script

### Tests
- ✅ `packages/orchestrator/src/__tests__/confidence-escalation.test.ts` - Unit tests

---

## 🚀 Next Steps

1. **Configure via Dashboard**: Log in and configure Metrica tenant (5 minutes)
2. **Test with Sample Messages**: Send test queries to verify (10 minutes)
3. **Monitor Initial Results**: Check escalation rates over first day
4. **Tune Thresholds**: Adjust based on false positives/negatives
5. **Enable for Other Tenants**: Roll out to additional tenants

---

## 💡 Tips

1. **Start with Standard Mode**: It's balanced and works well for most use cases
2. **Monitor Escalation Rates**: If >20% of messages escalate, thresholds are too high
3. **Use Disclaimers**: They're helpful for medium-confidence responses
4. **Domain-Specific**: Add custom high-stakes domains relevant to your business
5. **A/B Test**: Try different modes for different tenant types

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API is running (`curl http://localhost:3000/health`)
3. Check PM2 logs (`pm2 logs meta-chat-api`)
4. Verify tenant settings saved correctly in database

---

## ✨ Summary

**The confidence-based escalation system is now ready to use!**

✅ UI is fully functional
✅ Backend logic is implemented
✅ Per-tenant configuration works
✅ All you need to do is configure Metrica tenant via dashboard

**Time to configure**: ~5 minutes via dashboard UI
**Time to test**: ~10 minutes with sample queries
**Total time**: ~15 minutes to be fully operational

Enjoy smarter, adaptive human escalation! 🎉
