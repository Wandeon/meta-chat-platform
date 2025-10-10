#!/usr/bin/env tsx
/**
 * Confidence-Based Escalation Demo
 *
 * This demo shows how the confidence-based escalation system works
 * with various types of queries.
 *
 * Run: npx tsx examples/confidence-escalation-demo.ts
 */

import {
  createEscalationEngine,
  createStrictEscalationEngine,
  ConfidenceLevel,
  EscalationAction,
} from '../packages/orchestrator/src';
import type { CompletionResponse } from '../packages/llm/src';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(text: string) {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(text, 'cyan'));
  console.log('='.repeat(60));
}

function printConfidenceLevel(level: ConfidenceLevel): string {
  const levelColors: Record<ConfidenceLevel, keyof typeof colors> = {
    [ConfidenceLevel.HIGH]: 'green',
    [ConfidenceLevel.MEDIUM]: 'yellow',
    [ConfidenceLevel.LOW]: 'red',
    [ConfidenceLevel.VERY_LOW]: 'red',
  };
  return colorize(level.toUpperCase(), levelColors[level]);
}

function printAction(action: EscalationAction): string {
  const actionColors: Record<EscalationAction, keyof typeof colors> = {
    [EscalationAction.CONTINUE]: 'green',
    [EscalationAction.SEND_WITH_DISCLAIMER]: 'yellow',
    [EscalationAction.SUGGEST_REVIEW]: 'yellow',
    [EscalationAction.IMMEDIATE_ESCALATION]: 'red',
  };
  return colorize(action.toUpperCase(), actionColors[action]);
}

async function demonstrateQuery(
  title: string,
  userQuery: string,
  llmResponse: string,
  domainContext?: string,
  useStrict: boolean = false
) {
  console.log('\n' + colorize(`📝 ${title}`, 'bright'));
  console.log(colorize('User:', 'blue'), userQuery);
  console.log(colorize('AI:', 'magenta'), llmResponse);

  // Create mock response
  const response: CompletionResponse = {
    id: `demo-${Date.now()}`,
    created: Date.now(),
    model: 'gpt-4',
    content: llmResponse,
  };

  // Use strict or standard engine
  const engine = useStrict ? createStrictEscalationEngine() : createEscalationEngine();

  // Make decision
  const decision = await engine.decide(response, {
    tenantId: 'demo-tenant',
    conversationId: `demo-conv-${Date.now()}`,
    userMessage: userQuery,
    domainContext,
  });

  // Print results
  console.log('\n' + colorize('Analysis:', 'cyan'));
  console.log('  Confidence Level:', printConfidenceLevel(decision.analysis.level));
  console.log('  Confidence Score:', colorize(`${(decision.analysis.overallScore * 100).toFixed(1)}%`, 'cyan'));
  console.log('  Escalation Action:', printAction(decision.action));
  console.log('  Send AI Response:', decision.shouldSendResponse ? '✅' : '❌');
  console.log('  Notify Human:', decision.shouldNotifyHuman ? '🚨 YES' : '✅ NO');

  // Print signals
  if (decision.analysis.signals.length > 0) {
    console.log('\n  Signals:');
    decision.analysis.signals.forEach(signal => {
      const emoji = signal.score > 0.7 ? '✅' : signal.score > 0.4 ? '⚠️' : '❌';
      console.log(`    ${emoji} ${signal.name}: ${(signal.score * 100).toFixed(1)}% (weight: ${signal.weight})`);
      if (signal.reason) {
        console.log(`       → ${signal.reason}`);
      }
    });
  }

  // Print detected patterns
  if (decision.analysis.metadata.detectedPatterns.length > 0) {
    console.log('\n  Patterns:', decision.analysis.metadata.detectedPatterns.join(', '));
  }

  // Print modified response if available
  if (decision.modifiedResponse && decision.modifiedResponse !== llmResponse) {
    console.log('\n' + colorize('Modified Response (with disclaimer):', 'yellow'));
    console.log('  ' + decision.modifiedResponse.replace(/\n/g, '\n  '));
  }
}

async function runDemo() {
  printHeader('🤖 CONFIDENCE-BASED ESCALATION DEMO');
  console.log('This demo shows how the system analyzes LLM responses');
  console.log('and makes intelligent escalation decisions.\n');

  // Example 1: High Confidence (Simple FAQ)
  await demonstrateQuery(
    'Example 1: High Confidence FAQ',
    'What are your business hours?',
    'Our business hours are Monday through Friday, 9 AM to 5 PM EST. We are closed on weekends and major holidays.'
  );

  // Example 2: Medium Confidence (General Info)
  await demonstrateQuery(
    'Example 2: Medium Confidence',
    'How do I optimize my database queries?',
    'Based on general knowledge, you should consider adding indexes, using query caching, and optimizing your joins. However, the specific approach depends on your database system and use case.'
  );

  // Example 3: Low Confidence with Hedging
  await demonstrateQuery(
    'Example 3: Low Confidence',
    'What caused the error in my production system?',
    "I'm not entirely sure what's causing this specific error without more context. It might be related to a memory leak or a connection timeout. I think you should check your logs and perhaps consult with your DevOps team."
  );

  // Example 4: Explicit Low Confidence Marker
  await demonstrateQuery(
    'Example 4: Explicit Confidence Tag',
    'Should I invest in this cryptocurrency?',
    'Cryptocurrency investments are complex and risky. I cannot provide financial advice, and you should consult with a licensed financial advisor before making investment decisions. [confidence: low]'
  );

  // Example 5: Medical Query (High Stakes Domain)
  await demonstrateQuery(
    'Example 5: Medical Query (High Stakes)',
    'What medication should I take for my symptoms?',
    "I cannot provide medical advice or recommend medications. You should consult with a healthcare professional who can properly evaluate your symptoms and medical history. [confidence: very_low]",
    'medical'
  );

  // Example 6: Legal Query with Strict Engine
  await demonstrateQuery(
    'Example 6: Legal Query (Strict Mode)',
    'Can I sue my employer for this issue?',
    'While this situation may potentially have legal implications, I cannot provide legal advice. Employment law varies by jurisdiction, and you should consult with a qualified employment attorney who can review the specific details of your case.',
    'legal',
    true // Use strict engine
  );

  // Example 7: Confident Technical Response
  await demonstrateQuery(
    'Example 7: High Confidence Technical',
    'How do I reverse a string in Python?',
    'To reverse a string in Python, you can use slicing: `reversed_string = original_string[::-1]`. For example, if `original_string = "hello"`, then `reversed_string` would be "olleh". This is the most Pythonic and efficient way to reverse a string.'
  );

  // Example 8: Complex Query with Partial Information
  await demonstrateQuery(
    'Example 8: Partial Information',
    'Why is my API returning intermittent 503 errors?',
    'Intermittent 503 errors could be caused by several factors including server overload, database connection pool exhaustion, or upstream service unavailability. To properly diagnose this, you would need to examine your application logs, server metrics, and network traffic. I recommend checking these areas, but for production debugging, you may want to involve your infrastructure team. [confidence: medium]'
  );

  // Summary
  printHeader('📊 SUMMARY');
  console.log(`
${colorize('Key Takeaways:', 'bright')}

1. ${colorize('Simple FAQs', 'green')} → High confidence → Send normally
2. ${colorize('General guidance', 'yellow')} → Medium confidence → Add disclaimer
3. ${colorize('Uncertain responses', 'red')} → Low confidence → Notify human
4. ${colorize('High-stakes domains', 'red')} → Stricter thresholds → More likely to escalate

${colorize('Signals Used:', 'bright')}
• Self-assessment (explicit [confidence: X] tags)
• Hedging detection ("I think", "might be", "not sure")
• Response quality (completeness, specificity)
• Domain context (medical, legal, financial)

${colorize('Actions Taken:', 'bright')}
• ${colorize('CONTINUE', 'green')} - Send AI response as-is
• ${colorize('SEND_WITH_DISCLAIMER', 'yellow')} - Add uncertainty warning
• ${colorize('SUGGEST_REVIEW', 'yellow')} - Send but notify human
• ${colorize('IMMEDIATE_ESCALATION', 'red')} - Don't send, escalate immediately

${colorize('Configuration Tips:', 'bright')}
• Start with strict thresholds
• Monitor escalation rates
• Tune based on real-world feedback
• Use domain-specific rules for sensitive topics
  `);
}

// Run the demo
runDemo().catch(console.error);
