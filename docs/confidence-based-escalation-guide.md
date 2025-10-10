# Confidence-Based Escalation Guide

## Overview

The Confidence-Based Escalation System enables intelligent human-in-the-loop decisions based on the LLM's **certainty** about its responses, rather than relying solely on keyword triggers.

### Key Innovation

Instead of hardcoded keywords like "speak to a human", the system analyzes multiple signals to determine when the AI lacks confidence and should escalate to a human agent:

- **Self-Assessment**: LLM explicitly rates its own confidence
- **Hedging Detection**: Identifies uncertain language patterns
- **Response Quality**: Analyzes completeness and specificity
- **Domain Context**: Applies stricter thresholds for high-stakes topics (medical, legal, financial)

---

## Architecture

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
│  - Quality analysis     │
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

---

## Quick Start

### 1. Basic Usage

```typescript
import {
  createEscalationEngine,
  ConfidencePromptBuilder,
} from '@meta-chat/orchestrator';
import { createLLMProvider } from '@meta-chat/llm';

// Initialize components
const escalationEngine = createEscalationEngine();
const promptBuilder = escalationEngine.getPromptBuilder();
const llmProvider = createLLMProvider({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
});

// Build prompt with confidence instructions
const systemPrompt = promptBuilder.augmentSystemPrompt(
  'You are a helpful customer support assistant.'
);

// Get LLM response
const response = await llmProvider.complete({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'What is your return policy?' },
  ],
});

// Make escalation decision
const decision = await escalationEngine.decide(response, {
  tenantId: 'tenant-123',
  conversationId: 'conv-456',
  userMessage: 'What is your return policy?',
});

console.log('Action:', decision.action);
console.log('Confidence Score:', decision.analysis.overallScore);
console.log('Should Escalate:', decision.shouldNotifyHuman);

if (decision.shouldSendResponse) {
  // Send AI response (potentially with disclaimer)
  sendMessage(decision.modifiedResponse || response.content);
}

if (decision.shouldNotifyHuman) {
  // Notify human agent to take over
  notifyAgent(decision);
}
```

### 2. Using Enhanced Message Pipeline

```typescript
import { MessagePipelineWithEscalation } from '@meta-chat/orchestrator';
import { ChannelAdapterRegistry } from '@meta-chat/orchestrator';

const pipeline = new MessagePipelineWithEscalation({
  tenantId: 'tenant-123',
  channel: 'whatsapp',
  channelAdapters: registry,
  // Enable confidence-based escalation
  enableConfidenceEscalation: true,
  // Configure escalation rules
  escalationConfig: {
    rules: {
      immediateEscalationThreshold: 0.3, // <30% = immediate escalation
      suggestReviewThreshold: 0.6, // <60% = suggest review
      addDisclaimersForMediumConfidence: true,
    },
  },
});

// Process message - escalation happens automatically
await pipeline.process(incomingMessage);
```

---

## Configuration

### Confidence Thresholds

```typescript
import { createEscalationEngine } from '@meta-chat/orchestrator';

const engine = createEscalationEngine();

// Update thresholds
engine.updateConfig({
  rules: {
    // Very low confidence - don't send AI response
    immediateEscalationThreshold: 0.3,

    // Low confidence - send but notify human
    suggestReviewThreshold: 0.6,

    // Add disclaimers to medium confidence responses
    addDisclaimersForMediumConfidence: true,

    // Custom disclaimer text
    disclaimerTemplate: '\n\n⚠️ Please verify with an expert.',

    // Always escalate for these levels
    alwaysEscalateLevels: ['very_low'],

    // Override: always send AI response even when escalating
    alwaysSendAIResponse: false,
  },

  // Confidence analyzer config
  analyzerConfig: {
    thresholds: {
      highStakes: 0.8, // Medical, legal, financial
      standard: 0.6, // Normal queries
      lowStakes: 0.4, // Casual chat
    },

    // High-stakes keywords
    highStakesDomains: [
      'medical', 'health', 'diagnosis', 'medication',
      'legal', 'lawsuit', 'contract',
      'financial', 'investment', 'tax',
    ],

    // Signal weights
    weights: {
      selfAssessment: 0.5, // LLM's own rating
      hedgingDetection: 0.25, // Uncertain language
      responseQuality: 0.15, // Completeness/specificity
      consistencyCheck: 0.1, // Multi-sample consistency
    },
  },
});
```

### Preset Configurations

#### Strict Mode (for high-stakes environments)

```typescript
import { createStrictEscalationEngine } from '@meta-chat/orchestrator';

const engine = createStrictEscalationEngine();
// Thresholds: immediate=0.5, suggest=0.75
// Better safe than sorry - escalate more often
```

#### Lenient Mode (for casual chat)

```typescript
import { createLenientEscalationEngine } from '@meta-chat/orchestrator';

const engine = createLenientEscalationEngine();
// Thresholds: immediate=0.2, suggest=0.4
// Trust the AI more - escalate less often
```

---

## Self-Assessment Strategies

### 1. Explicit Marker (Recommended)

```typescript
import {
  ConfidencePromptBuilder,
  SelfAssessmentStrategy,
} from '@meta-chat/orchestrator';

const builder = new ConfidencePromptBuilder({
  strategy: SelfAssessmentStrategy.EXPLICIT_MARKER,
});

// LLM adds tags like: [confidence: low]
```

**Example Response:**
```
"Based on limited information, this might work. [confidence: medium]"
```

### 2. Chain-of-Thought

```typescript
const builder = new ConfidencePromptBuilder({
  strategy: SelfAssessmentStrategy.CHAIN_OF_THOUGHT,
});

// LLM explains reasoning before answering
```

**Example Response:**
```
"Based on my knowledge: I'm certain about X but uncertain about Y.
The answer is probably Z, but I recommend verification."
```

### 3. Uncertainty Acknowledgment

```typescript
const builder = new ConfidencePromptBuilder({
  strategy: SelfAssessmentStrategy.UNCERTAINTY_ACKNOWLEDGMENT,
});

// LLM explicitly states when unsure
```

**Example Response:**
```
"I'm not entirely sure about this, but based on general knowledge...
You should consult a specialist to verify."
```

---

## Real-World Examples

### Example 1: Customer Support Bot

```typescript
// Scenario: Customer asks about complex refund policy
const response = await llm.complete({
  messages: [
    { role: 'system', content: augmentedSystemPrompt },
    { role: 'user', content: 'Can I return a customized item after 60 days?' },
  ],
});

// LLM Response:
// "I'm not entirely sure about the policy for customized items beyond
//  the standard return window. You should contact our support team
//  directly for clarification. [confidence: low]"

const decision = await engine.decide(response, context);
// Result: SUGGEST_REVIEW
// Action: Send AI response + notify human agent
```

### Example 2: Medical Chatbot

```typescript
// Scenario: User asks for medical advice (HIGH STAKES)
const response = await llm.complete({
  messages: [
    { role: 'system', content: augmentedSystemPrompt },
    { role: 'user', content: 'What medication should I take for this symptom?' },
  ],
});

// LLM Response:
// "I cannot provide medical advice. You should consult a healthcare
//  professional for proper diagnosis and treatment. [confidence: very_low]"

const decision = await engine.decide(response, {
  ...context,
  domainContext: 'medical', // Triggers high-stakes threshold
});

// Result: IMMEDIATE_ESCALATION
// Action: Do NOT send AI response, escalate immediately
```

### Example 3: FAQ Bot (High Confidence)

```typescript
// Scenario: User asks simple FAQ question
const response = await llm.complete({
  messages: [
    { role: 'system', content: augmentedSystemPrompt },
    { role: 'user', content: 'What are your business hours?' },
  ],
});

// LLM Response:
// "Our business hours are Monday-Friday, 9 AM to 5 PM EST."
// (No confidence tag = high confidence)

const decision = await engine.decide(response, context);
// Result: CONTINUE
// Action: Send AI response normally
```

### Example 4: Technical Support (Medium Confidence)

```typescript
// Scenario: Debugging question
const response = await llm.complete({
  messages: [
    { role: 'system', content: augmentedSystemPrompt },
    { role: 'user', content: 'Why is my API returning 500 errors?' },
  ],
});

// LLM Response:
// "This could be due to several reasons like database connection issues
//  or server overload. Check your logs for details. [confidence: medium]"

const decision = await engine.decide(response, context);
// Result: SEND_WITH_DISCLAIMER
// Modified Response:
// "This could be due to several reasons...
//
//  ⚠️ Note: I may not have complete information about this topic.
//  Please verify with an expert if this is important."
```

---

## Monitoring & Analytics

### Track Escalation Metrics

```typescript
// Listen to escalation events
eventManager.on(EventType.HUMAN_HANDOFF_REQUESTED, async (event) => {
  const { reason, confidenceScore, confidenceLevel } = event.data;

  // Log to analytics
  analytics.track('escalation', {
    reason,
    confidenceScore,
    confidenceLevel,
    tenantId: event.tenantId,
    conversationId: event.data.conversationId,
  });

  // Update dashboard metrics
  metrics.increment('escalations_total', { reason });
  metrics.histogram('confidence_scores', confidenceScore);
});
```

### Analyze Confidence Patterns

```typescript
// Get detailed analysis
const analysis = decision.analysis;

console.log('Overall Score:', analysis.overallScore);
console.log('Confidence Level:', analysis.level);
console.log('Detected Patterns:', analysis.metadata.detectedPatterns);

// Inspect individual signals
analysis.signals.forEach(signal => {
  console.log(`Signal: ${signal.name}`);
  console.log(`  Score: ${signal.score}`);
  console.log(`  Weight: ${signal.weight}`);
  console.log(`  Reason: ${signal.reason}`);
});
```

---

## Best Practices

### 1. Tune Thresholds Iteratively

Start conservative (high thresholds), then relax based on real-world performance:

```typescript
// Week 1: Strict (minimize false negatives)
const engine = createStrictEscalationEngine();

// Week 2+: Analyze metrics and adjust
engine.updateConfig({
  rules: {
    immediateEscalationThreshold: 0.35, // Was 0.5
    suggestReviewThreshold: 0.65, // Was 0.75
  },
});
```

### 2. Domain-Specific Rules

Apply stricter rules for sensitive domains:

```typescript
const domainRules = {
  medical: createStrictEscalationEngine(),
  legal: createStrictEscalationEngine(),
  customer_service: createEscalationEngine(),
  casual_chat: createLenientEscalationEngine(),
};

const engine = domainRules[detectedDomain] || createEscalationEngine();
```

### 3. A/B Testing

Compare confidence-based vs keyword-based escalation:

```typescript
const useConfidenceEscalation = Math.random() < 0.5; // 50/50 split

const pipeline = new MessagePipelineWithEscalation({
  ...options,
  enableConfidenceEscalation: useConfidenceEscalation,
});

// Track which performs better
```

### 4. Feedback Loop

Use human agent feedback to improve thresholds:

```typescript
// Agent reviews escalated conversation
async function handleAgentFeedback(conversationId: string, wasNecessary: boolean) {
  const analysis = await getAnalysisForConversation(conversationId);

  if (!wasNecessary && analysis.overallScore < 0.5) {
    // False positive - threshold too high
    logger.info('Consider lowering threshold', { analysis });
  }

  if (wasNecessary && analysis.overallScore > 0.7) {
    // False negative - threshold too low
    logger.info('Consider raising threshold', { analysis });
  }
}
```

---

## Troubleshooting

### Problem: Too Many Escalations

**Solution**: Lower thresholds or use lenient mode

```typescript
engine.updateConfig({
  rules: {
    immediateEscalationThreshold: 0.2, // Was 0.3
    suggestReviewThreshold: 0.5, // Was 0.6
  },
});
```

### Problem: Not Escalating When It Should

**Solution**: Raise thresholds or add domain keywords

```typescript
engine.updateConfig({
  analyzerConfig: {
    thresholds: {
      highStakes: 0.85, // Was 0.8
    },
    highStakesDomains: [
      ...DEFAULT_CONFIDENCE_CONFIG.highStakesDomains,
      'custom', 'domain', 'keywords',
    ],
  },
});
```

### Problem: LLM Not Including Confidence Tags

**Solution**: Strengthen prompt instructions or change strategy

```typescript
const builder = new ConfidencePromptBuilder({
  strategy: SelfAssessmentStrategy.CHAIN_OF_THOUGHT, // More explicit
});

// Or modify system prompt directly
const systemPrompt = `
${basePrompt}

CRITICAL: You MUST assess your confidence for every response.
If you are not 100% certain, include [confidence: <level>] at the end.
`;
```

---

## Migration from Keyword-Based Escalation

### Before (Keyword-Based)

```typescript
// Old approach
function shouldEscalate(message: string): boolean {
  const keywords = ['speak to human', 'talk to agent', 'need help'];
  return keywords.some(k => message.toLowerCase().includes(k));
}
```

### After (Confidence-Based)

```typescript
// New approach - no hardcoded keywords needed!
const decision = await escalationEngine.decide(response, context);
return decision.shouldNotifyHuman;
```

### Hybrid Approach (Recommended for Transition)

Keep both systems during transition:

```typescript
// Check keywords first (backward compatible)
if (shouldTriggerHumanHandoff(config, message)) {
  return handleHumanHandoff(conversation, message, config, 'keyword');
}

// Then check confidence
const decision = await escalationEngine.decide(response, context);
if (decision.shouldNotifyHuman) {
  return handleHumanHandoff(conversation, message, config, 'low_confidence');
}
```

---

## Performance Considerations

- **Latency**: Adds ~10-50ms for confidence analysis (negligible)
- **Token Usage**: Self-assessment adds ~50-100 tokens per request
- **Memory**: Minimal - no persistent state needed

---

## Conclusion

The Confidence-Based Escalation System provides intelligent, adaptive human-in-the-loop capabilities that **learn from the LLM's own uncertainty signals** rather than relying on brittle keyword matching.

**Key Benefits:**
- ✅ Handles edge cases you didn't anticipate
- ✅ Adapts to context automatically
- ✅ Reduces false escalations
- ✅ Improves user trust through honesty about uncertainty

**Next Steps:**
1. Start with strict thresholds
2. Monitor escalation metrics
3. Tune based on real-world performance
4. Iterate continuously with agent feedback
