# Confidence-Based Escalation

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  
**Maintainer:** AI/ML Team

## Overview

The Confidence-Based Escalation System provides intelligent human-in-the-loop decisions based on the LLM's certainty about its responses. Rather than relying solely on keyword triggers, the system analyzes multiple signals to determine when the AI lacks confidence and should escalate to a human agent.

### Key Features

- **Multi-Signal Analysis**: Combines self-assessment, hedging detection, response quality, and domain context
- **Per-Tenant Configuration**: Each tenant can configure their own thresholds and escalation modes
- **Automatic Status Transitions**: Conversations automatically transition from `active` to `assigned_human` when escalation occurs
- **Context-Aware Thresholds**: Applies stricter confidence requirements for high-stakes domains (medical, legal, financial)
- **Flexible Response Handling**: Can send AI response with disclaimer, suggest review, or immediately escalate without sending AI response

### How It Works

1. **Prompt Augmentation**: System instructions are added to the LLM prompt asking it to self-assess confidence
2. **Response Generation**: LLM generates response and may include confidence markers like `[confidence: low]`
3. **Multi-Signal Analysis**: ConfidenceAnalyzer evaluates the response using multiple signals
4. **Escalation Decision**: EscalationEngine decides whether to send response, add disclaimers, or escalate to human
5. **Event & Status Update**: If escalated, creates `human_handoff.requested` event and updates conversation status

---

## Architecture

### Component Overview

```
┌─────────────────┐
│  User Message   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Prompt Builder         │
│  (adds confidence        │
│   instructions)          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  LLM Provider           │
│  (generates response     │
│   with confidence tags)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Confidence Analyzer    │
│  - Self-assessment      │
│  - Hedging detection    │
│  - Response quality     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Escalation Engine      │
│  (decides action)        │
└────────┬────────────────┘
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│ Send   │ │ Escalate to  │
│ AI Msg │ │ Human Agent  │
└────────┘ └──────────────┘
```

### Core Components

#### 1. ConfidenceAnalyzer

**Location**: `packages/orchestrator/src/confidence-analyzer.ts`

Analyzes LLM responses using multiple signals:

- **Self-Assessment Signal** (weight: 0.5): Extracts explicit confidence markers from response
  - Patterns: `[confidence: high|medium|low|very_low]` or `(confidence: 85%)`
  
- **Hedging Detection Signal** (weight: 0.25): Identifies uncertain language patterns
  - Hedging phrases: "I'm not sure", "might be", "possibly", "you should ask an expert"
  - Confidence phrases: "definitely", "certainly", "I'm confident that"
  
- **Response Quality Signal** (weight: 0.15): Analyzes completeness and specificity
  - Length appropriateness
  - Answer completeness (deflections vs direct answers)
  - Specificity (numbers, dates, concrete details vs vague language)

- **Consistency Check Signal** (weight: 0.1): Disabled by default, requires multiple samples

**Confidence Levels**:
- `HIGH`: Score ≥ 0.8 (80%)
- `MEDIUM`: Score ≥ 0.6 (60%)
- `LOW`: Score ≥ 0.4 (40%)
- `VERY_LOW`: Score < 0.4 (40%)

**Thresholds**:
- **High Stakes**: 0.8 (medical, legal, financial, health, diagnosis, medication, lawsuit, investment, emergency)
- **Standard**: 0.6 (general queries)
- **Low Stakes**: 0.4 (casual chat)

#### 2. EscalationEngine

**Location**: `packages/orchestrator/src/escalation-engine.ts`

Makes escalation decisions based on confidence analysis:

**Escalation Actions**:
- `CONTINUE`: High confidence, send response normally
- `SEND_WITH_DISCLAIMER`: Medium confidence, add disclaimer to response
- `SUGGEST_REVIEW`: Low confidence, send response but notify human agent
- `IMMEDIATE_ESCALATION`: Very low confidence, don't send AI response, escalate immediately

**Default Rules**:
- Immediate escalation threshold: 0.3 (< 30% confidence)
- Suggest review threshold: 0.6 (< 60% confidence)
- Add disclaimers for medium confidence: enabled
- Default disclaimer: `⚠️ Note: I may not have complete information about this topic. Please verify with an expert if this is important.`

#### 3. ConfidencePromptBuilder

**Location**: `packages/orchestrator/src/confidence-prompt-builder.ts`

Augments prompts with confidence assessment instructions.

**Strategies**:

- **Explicit Marker** (default): LLM includes `[confidence: level]` tag in response
  ```
  After formulating your response, assess your confidence:
  - HIGH: Clear, factual knowledge and certainty
  - MEDIUM: Can answer but have some uncertainty
  - LOW: Limited knowledge or significant uncertainty
  - VERY_LOW: Should defer to human expert
  
  Include tag at END: [confidence: <level>]
  ```

- **Chain of Thought**: LLM explains reasoning before answering
  ```
  Before providing your answer, explain:
  1. What information do you have?
  2. What are you certain vs uncertain about?
  3. What knowledge gaps exist?
  4. How confident are you?
  ```

- **Uncertainty Acknowledgment**: LLM explicitly states when uncertain
  ```
  Be honest about limits of your knowledge:
  - If NOT CERTAIN, use: "I'm not entirely sure, but..."
  - For HIGH-STAKES topics, recommend professional consultation
  - If you DON'T KNOW, say "I don't know" directly
  ```

- **Post Reflection**: LLM reflects on confidence after answering
  ```
  After your answer, add:
  Reflection: [Your honest assessment]
  Confidence: [High/Medium/Low]
  Recommendation: [Whether to seek expert verification]
  ```

#### 4. EscalationConfigBuilder

**Location**: `packages/orchestrator/src/escalation-config-builder.ts`

Builds escalation configuration from tenant settings.

**Modes**:
- **Strict**: Immediate: 50%, Review: 75%, Analyzer thresholds: 0.85/0.7/0.5
- **Standard**: Immediate: 30%, Review: 60%, Analyzer thresholds: 0.8/0.6/0.4 (default)
- **Lenient**: Immediate: 20%, Review: 40%, Analyzer thresholds: 0.7/0.5/0.3

---

## Deployment & Setup

### 1. Enable for Tenant

Update tenant settings in database:

```typescript
await prisma.tenant.update({
  where: { id: 'tenant-123' },
  data: {
    settings: {
      // ... other settings
      confidenceEscalation: {
        enabled: true,
        mode: 'standard', // 'strict' | 'standard' | 'lenient'
      },
    },
  },
});
```

### 2. Per-Tenant Configuration Options

```typescript
interface TenantConfidenceEscalationSettings {
  enabled: boolean;
  mode: 'standard' | 'strict' | 'lenient';
  
  // Optional overrides (defaults from mode preset if not specified)
  immediateEscalationThreshold?: number; // 0-1, e.g., 0.3 = 30%
  suggestReviewThreshold?: number; // 0-1, e.g., 0.6 = 60%
  
  // Disclaimer configuration
  addDisclaimers?: boolean; // Add disclaimers to medium-confidence responses
  disclaimerText?: string; // Custom disclaimer text
  
  // Prompt strategy
  selfAssessmentStrategy?: 'explicit_marker' | 'chain_of_thought' | 'uncertainty_acknowledgment';
  
  // Tenant-specific high-stakes domains (added to defaults)
  highStakesDomains?: string[]; // e.g., ['prescription', 'surgery']
}
```

### 3. Example Configurations

#### Standard Mode (General Use)
```typescript
{
  enabled: true,
  mode: 'standard'
}
```

#### Strict Mode (Medical/Legal)
```typescript
{
  enabled: true,
  mode: 'strict',
  disclaimerText: '\n\n⚠️ This information is general. Always consult a licensed professional.',
  highStakesDomains: ['prescription', 'surgery', 'emergency', 'contract', 'lawsuit']
}
```

#### Lenient Mode (Casual Chat)
```typescript
{
  enabled: true,
  mode: 'lenient',
  addDisclaimers: false,
  selfAssessmentStrategy: 'uncertainty_acknowledgment'
}
```

#### Custom Thresholds
```typescript
{
  enabled: true,
  mode: 'standard',
  immediateEscalationThreshold: 0.4, // Override: escalate at <40% instead of <30%
  suggestReviewThreshold: 0.7,        // Override: suggest review at <70% instead of <60%
}
```

### 4. Integration in Chat Route

**Location**: `apps/api/src/routes/chat.ts`

The chat route automatically integrates confidence escalation when enabled:

```typescript
// Check if enabled for tenant
const enableConfidenceEscalation = isConfidenceEscalationEnabled(settings);
const escalationConfig = enableConfidenceEscalation
  ? buildEscalationConfigFromTenant(settings)
  : undefined;

// Initialize components
let escalationEngine: EscalationEngine | undefined;
if (enableConfidenceEscalation && escalationConfig) {
  escalationEngine = new EscalationEngine(escalationConfig);
}

// ... generate LLM response ...

// Analyze and decide
if (escalationEngine) {
  const decision = await escalationEngine.decide(response, {
    tenantId: payload.tenantId,
    conversationId: conversation.id,
    userMessage: payload.message,
    conversationHistory: conversation.messages?.map(m => m.content),
  });

  // Handle immediate escalation
  if (decision.action === EscalationAction.IMMEDIATE_ESCALATION) {
    // Create escalation event
    await prisma.event.create({
      data: {
        type: 'human_handoff.requested',
        tenantId: payload.tenantId,
        conversationId: conversation.id,
        data: {
          reason: 'low_confidence',
          confidenceScore: decision.analysis.overallScore,
          confidenceLevel: decision.analysis.level,
          signals: decision.analysis.signals,
        },
      },
    });

    // Update conversation status
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'assigned_human',
        metadata: {
          humanHandoffRequested: true,
          handoffReason: 'low_confidence',
          requestedAt: new Date().toISOString(),
        },
      },
    });
  }

  // Use modified response (may have disclaimer added)
  responseToSend = decision.modifiedResponse || response.message;
}
```

---

## API Reference

### Response Metadata

When confidence escalation is enabled, the chat API response includes confidence metadata:

```typescript
{
  message: "The response text...",
  conversationId: "conv-123",
  metadata: {
    confidenceEscalation: {
      enabled: true,
      escalated: false, // true if escalation occurred
      action: "continue", // 'continue' | 'send_with_disclaimer' | 'suggest_review' | 'immediate_escalation'
      confidenceScore: 0.85, // 0-1
      confidenceLevel: "high" // 'high' | 'medium' | 'low' | 'very_low'
    }
  }
}
```

### Conversation Status Transitions

**Status Field**: `conversations.status`

**Values**:
- `active`: Normal conversation, AI handling
- `assigned_human`: Escalated to human agent (triggered by confidence escalation)
- `closed`: Conversation ended

**Escalation Trigger**:
```typescript
// When action === IMMEDIATE_ESCALATION
await prisma.conversation.update({
  where: { id: conversationId },
  data: {
    status: 'assigned_human',
    metadata: {
      humanHandoffRequested: true,
      handoffReason: 'low_confidence',
      requestedAt: new Date().toISOString(),
    },
  },
});
```

### Events

**Event Type**: `human_handoff.requested`

**Event Data**:
```typescript
{
  type: 'human_handoff.requested',
  tenantId: 'tenant-123',
  conversationId: 'conv-456',
  timestamp: Date,
  data: {
    reason: 'low_confidence',
    confidenceScore: 0.25,
    confidenceLevel: 'very_low',
    userMessage: 'What medication should I take?',
    aiResponse: 'I am not qualified to provide medical advice...',
    signals: [
      {
        name: 'self_assessment',
        score: 0.2,
        reason: 'Self-assessed confidence: low'
      },
      {
        name: 'hedging_detection',
        score: 0.3,
        reason: 'Found 4 hedging phrase(s)'
      }
    ],
    shouldEscalate: true,
    escalationReason: 'Confidence score 25% is below threshold 30%. High-stakes domain detected.'
  }
}
```

---

## Operations

### Monitoring Escalations

#### 1. Query Escalated Conversations

```typescript
// Find conversations needing human attention
const escalatedConversations = await prisma.conversation.findMany({
  where: {
    tenantId: 'tenant-123',
    status: 'assigned_human',
  },
  include: {
    messages: {
      orderBy: { timestamp: 'desc' },
      take: 10,
    },
  },
});
```

#### 2. Query Escalation Events

```typescript
// Find all confidence-based escalation events
const escalationEvents = await prisma.event.findMany({
  where: {
    tenantId: 'tenant-123',
    type: 'human_handoff.requested',
  },
  orderBy: { timestamp: 'desc' },
  take: 50,
});

// Analyze escalation patterns
const lowConfidenceEvents = escalationEvents.filter(e => 
  e.data.confidenceScore < 0.3
);
```

#### 3. Check Response Metadata

```typescript
// Query messages with confidence data
const messagesWithConfidence = await prisma.message.findMany({
  where: {
    tenantId: 'tenant-123',
    direction: 'outbound',
    metadata: {
      path: ['confidenceEscalation', 'enabled'],
      equals: true,
    },
  },
});

// Analyze confidence distribution
const confidenceScores = messagesWithConfidence.map(m => 
  m.metadata?.confidenceEscalation?.confidenceScore
).filter(Boolean);
```

### Adjusting Thresholds

#### 1. Too Many Escalations (False Positives)

**Symptoms**: AI escalates frequently even for simple questions

**Solutions**:
- Switch to `lenient` mode
- Lower thresholds:
  ```typescript
  {
    immediateEscalationThreshold: 0.2, // from 0.3
    suggestReviewThreshold: 0.5         // from 0.6
  }
  ```
- Change strategy to `uncertainty_acknowledgment` (less strict than `explicit_marker`)

#### 2. Too Few Escalations (False Negatives)

**Symptoms**: AI sends incorrect/uncertain responses without escalating

**Solutions**:
- Switch to `strict` mode
- Raise thresholds:
  ```typescript
  {
    immediateEscalationThreshold: 0.5, // from 0.3
    suggestReviewThreshold: 0.75        // from 0.6
  }
  ```
- Add domain-specific keywords:
  ```typescript
  {
    highStakesDomains: ['billing', 'refund', 'cancellation']
  }
  ```

#### 3. Optimize Based on Metrics

```typescript
// Analyze escalation accuracy
const events = await prisma.event.findMany({
  where: {
    tenantId: 'tenant-123',
    type: 'human_handoff.requested',
  },
});

const avgConfidenceScore = events.reduce((sum, e) => 
  sum + e.data.confidenceScore, 0
) / events.length;

console.log(`Average confidence at escalation: ${avgConfidenceScore}`);

// If avg is much lower than threshold, system is working well
// If avg is close to threshold, may need to adjust
```

### Dashboard Queries

#### Escalation Rate

```typescript
// Calculate escalation rate for tenant
const totalConversations = await prisma.conversation.count({
  where: {
    tenantId: 'tenant-123',
    createdAt: { gte: new Date('2025-11-01') },
  },
});

const escalatedConversations = await prisma.conversation.count({
  where: {
    tenantId: 'tenant-123',
    status: 'assigned_human',
    createdAt: { gte: new Date('2025-11-01') },
  },
});

const escalationRate = (escalatedConversations / totalConversations) * 100;
console.log(`Escalation rate: ${escalationRate.toFixed(2)}%`);
```

#### Confidence Distribution

```typescript
// Group by confidence level
const messages = await prisma.message.findMany({
  where: {
    tenantId: 'tenant-123',
    direction: 'outbound',
    timestamp: { gte: new Date('2025-11-01') },
  },
  select: {
    metadata: true,
  },
});

const distribution = messages.reduce((acc, msg) => {
  const level = msg.metadata?.confidenceEscalation?.confidenceLevel;
  if (level) {
    acc[level] = (acc[level] || 0) + 1;
  }
  return acc;
}, {} as Record<string, number>);

console.log('Confidence distribution:', distribution);
// Example: { high: 450, medium: 120, low: 25, very_low: 5 }
```

---

## Code References

### Core Implementation

- **ConfidenceAnalyzer**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/confidence-analyzer.ts`
- **EscalationEngine**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/escalation-engine.ts`
- **ConfidencePromptBuilder**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/confidence-prompt-builder.ts`
- **EscalationConfigBuilder**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/escalation-config-builder.ts`

### Integration

- **Chat API Route**: `/home/deploy/meta-chat-platform/apps/api/src/routes/chat.ts`
- **Message Pipeline**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/message-pipeline-with-escalation.ts`

### Testing

- **Unit Tests**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/__tests__/confidence-escalation.test.ts`

### Database Schema

- **Conversation Model**: `/home/deploy/meta-chat-platform/packages/database/prisma/schema.prisma`
  - Status field: `active` | `assigned_human` | `closed`
  - Metadata field: JSON for escalation details

---

## Related Documentation

- [Confidence Escalation Quick Start](/home/deploy/meta-chat-platform/CONFIDENCE-ESCALATION-QUICK-START.md)
- [Confidence Escalation Setup Summary](/home/deploy/meta-chat-platform/CONFIDENCE-ESCALATION-SETUP-SUMMARY.md)
- [Per-Tenant Confidence Configuration](/home/deploy/meta-chat-platform/docs/per-tenant-confidence-configuration.md)
- [Confidence-Based Escalation Guide](/home/deploy/meta-chat-platform/docs/confidence-based-escalation-guide.md)
- [API Documentation](/home/deploy/meta-chat-platform/docs/API.md)
- [Channels Documentation](/home/deploy/meta-chat-platform/docs/CHANNELS.md)
- [Architecture Overview](/home/deploy/meta-chat-platform/docs/ARCHITECTURE.md)

---

## Troubleshooting

### Issue: Confidence markers not being extracted

**Symptoms**: Self-assessment signal always missing

**Solutions**:
1. Check prompt builder is augmenting system prompt:
   ```typescript
   const promptBuilder = escalationEngine.getPromptBuilder();
   const augmentedPrompt = promptBuilder.augmentSystemPrompt(systemPrompt);
   console.log(augmentedPrompt); // Should contain confidence instructions
   ```

2. Verify LLM supports instruction following (GPT-4, Claude, DeepSeek work well)

3. Try different strategy:
   ```typescript
   selfAssessmentStrategy: 'uncertainty_acknowledgment'
   ```

### Issue: Escalations not updating conversation status

**Symptoms**: Events created but status stays `active`

**Solutions**:
1. Check database update is executing:
   ```typescript
   // Add logging after conversation.update
   console.log('Updated conversation status to assigned_human');
   ```

2. Verify user has permissions to update conversations

3. Check for database transaction issues

### Issue: High false positive rate

**Symptoms**: Simple questions trigger escalation

**Solutions**:
1. Analyze hedging detection:
   ```typescript
   // Check which signals are scoring low
   decision.analysis.signals.forEach(s => {
     console.log(`${s.name}: ${s.score} - ${s.reason}`);
   });
   ```

2. Adjust weights to reduce hedging impact:
   ```typescript
   analyzerConfig: {
     weights: {
       selfAssessment: 0.6,
       hedgingDetection: 0.15, // Reduced from 0.25
       responseQuality: 0.2,
       consistencyCheck: 0.05,
     }
   }
   ```

### Issue: Not detecting high-stakes domains

**Symptoms**: Medical/legal questions don't use stricter thresholds

**Solutions**:
1. Check domain context is being passed:
   ```typescript
   const analysis = await analyzer.analyze(response, {
     userMessage: payload.message,
     domainContext: 'medical', // Pass explicit context if known
   });
   ```

2. Add custom high-stakes keywords:
   ```typescript
   highStakesDomains: ['prescription', 'surgery', 'emergency', 'diagnosis']
   ```

3. Verify keywords are present in user message or domain context

---

**End of Documentation**
