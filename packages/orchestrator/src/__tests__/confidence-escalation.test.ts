import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConfidenceAnalyzer,
  ConfidenceLevel,
  DEFAULT_CONFIDENCE_CONFIG,
} from '../confidence-analyzer';
import {
  ConfidencePromptBuilder,
  SelfAssessmentStrategy,
} from '../confidence-prompt-builder';
import {
  EscalationEngine,
  EscalationAction,
  createEscalationEngine,
  createStrictEscalationEngine,
  createLenientEscalationEngine,
} from '../escalation-engine';
import type { CompletionResponse, CompletionMessage } from '@meta-chat/llm';

describe('ConfidenceAnalyzer', () => {
  let analyzer: ConfidenceAnalyzer;

  beforeEach(() => {
    analyzer = new ConfidenceAnalyzer();
  });

  it('should detect high confidence in clear responses', async () => {
    const response: CompletionResponse = {
      id: 'test-1',
      created: Date.now(),
      model: 'gpt-4',
      content: 'The capital of France is Paris. This is a well-established geographical fact.',
    };

    const analysis = await analyzer.analyze(response, {
      userMessage: 'What is the capital of France?',
    });

    expect(analysis.level).toBe(ConfidenceLevel.HIGH);
    expect(analysis.shouldEscalate).toBe(false);
    expect(analysis.overallScore).toBeGreaterThan(0.7);
  });

  it('should detect low confidence with hedging language', async () => {
    const response: CompletionResponse = {
      id: 'test-2',
      created: Date.now(),
      model: 'gpt-4',
      content: "I'm not entirely sure, but it might be around 42. Perhaps you should verify this with an expert.",
    };

    const analysis = await analyzer.analyze(response, {
      userMessage: 'What is the exact measurement?',
    });

    expect(analysis.level).toBe(ConfidenceLevel.LOW);
    expect(analysis.shouldEscalate).toBe(true);
    expect(analysis.signals.some(s => s.name === 'hedging_detection')).toBe(true);
  });

  it('should detect explicit self-assessment markers', async () => {
    const response: CompletionResponse = {
      id: 'test-3',
      created: Date.now(),
      model: 'gpt-4',
      content: 'Based on limited information, this could be the answer. [confidence: low]',
    };

    const analysis = await analyzer.analyze(response, {
      userMessage: 'What is the solution?',
    });

    expect(analysis.signals.some(s => s.name === 'self_assessment')).toBe(true);
    expect(analysis.shouldEscalate).toBe(true);
  });

  it('should use stricter thresholds for high-stakes domains', async () => {
    const response: CompletionResponse = {
      id: 'test-4',
      created: Date.now(),
      model: 'gpt-4',
      content: 'You might want to take 500mg twice daily, but I think you should consult your doctor.',
    };

    const analysis = await analyzer.analyze(response, {
      userMessage: 'What medication dosage should I take?',
    });

    // Should detect "medical" as high-stakes
    expect(analysis.metadata.detectedPatterns).toContain('high_stakes_domain');
    expect(analysis.shouldEscalate).toBe(true);
  });

  it('should handle percentage-based confidence markers', async () => {
    const response: CompletionResponse = {
      id: 'test-5',
      created: Date.now(),
      model: 'gpt-4',
      content: 'This is probably the right answer. (confidence: 85%)',
    };

    const analysis = await analyzer.analyze(response, {
      userMessage: 'Is this correct?',
    });

    const selfAssessment = analysis.signals.find(s => s.name === 'self_assessment');
    expect(selfAssessment).toBeDefined();
    expect(selfAssessment?.score).toBe(0.85);
  });
});

describe('ConfidencePromptBuilder', () => {
  it('should augment system prompt with explicit marker instructions', () => {
    const builder = new ConfidencePromptBuilder({
      strategy: SelfAssessmentStrategy.EXPLICIT_MARKER,
      includeInstructions: true,
      instructionPlacement: 'system',
    });

    const basePrompt = 'You are a helpful assistant.';
    const augmented = builder.augmentSystemPrompt(basePrompt);

    expect(augmented).toContain(basePrompt);
    expect(augmented).toContain('Confidence Self-Assessment');
    expect(augmented).toContain('[confidence:');
  });

  it('should augment messages array', () => {
    const builder = new ConfidencePromptBuilder({
      strategy: SelfAssessmentStrategy.CHAIN_OF_THOUGHT,
    });

    const messages: CompletionMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ];

    const augmented = builder.augmentMessages(messages);

    expect(augmented[0].content).toContain('Transparent Reasoning');
  });

  it('should extract confidence markers from responses', () => {
    const content = 'This is my answer. [confidence: medium]';
    const result = ConfidencePromptBuilder.extractConfidenceMarker(content);

    expect(result.confidence).toBe('medium');
    expect(result.cleanedContent).toBe('This is my answer.');
  });

  it('should handle various marker formats', () => {
    const formats = [
      '[confidence: high]',
      '[confidence: low]',
      '[confidence: very_low]',
      '[confidence: very low]',
    ];

    for (const format of formats) {
      const result = ConfidencePromptBuilder.extractConfidenceMarker(`Test ${format}`);
      expect(result.confidence).toBeDefined();
    }
  });
});

describe('EscalationEngine', () => {
  let engine: EscalationEngine;

  beforeEach(() => {
    engine = createEscalationEngine();
  });

  it('should decide to continue for high confidence responses', async () => {
    const response: CompletionResponse = {
      id: 'test-1',
      created: Date.now(),
      model: 'gpt-4',
      content: 'This is definitely the correct answer based on established facts.',
    };

    const decision = await engine.decide(response, {
      tenantId: 'tenant-1',
      conversationId: 'conv-1',
      userMessage: 'What is 2+2?',
    });

    expect(decision.action).toBe(EscalationAction.CONTINUE);
    expect(decision.shouldSendResponse).toBe(true);
    expect(decision.shouldNotifyHuman).toBe(false);
  });

  it('should immediately escalate for very low confidence', async () => {
    const response: CompletionResponse = {
      id: 'test-2',
      created: Date.now(),
      model: 'gpt-4',
      content: "I don't have enough information to answer this. You should consult a specialist. [confidence: very_low]",
    };

    const decision = await engine.decide(response, {
      tenantId: 'tenant-1',
      conversationId: 'conv-1',
      userMessage: 'What should I do?',
    });

    expect(decision.action).toBe(EscalationAction.IMMEDIATE_ESCALATION);
    expect(decision.shouldSendResponse).toBe(false);
    expect(decision.shouldNotifyHuman).toBe(true);
  });

  it('should suggest review for medium-low confidence', async () => {
    const response: CompletionResponse = {
      id: 'test-3',
      created: Date.now(),
      model: 'gpt-4',
      content: 'This might be the answer, but I'm not entirely certain about the details.',
    };

    const decision = await engine.decide(response, {
      tenantId: 'tenant-1',
      conversationId: 'conv-1',
      userMessage: 'What is the solution?',
    });

    expect([EscalationAction.SUGGEST_REVIEW, EscalationAction.SEND_WITH_DISCLAIMER]).toContain(decision.action);
    expect(decision.shouldNotifyHuman).toBe(true);
  });

  it('should add disclaimers for medium confidence', async () => {
    const response: CompletionResponse = {
      id: 'test-4',
      created: Date.now(),
      model: 'gpt-4',
      content: 'Based on general knowledge, this seems correct.',
    };

    const decision = await engine.decide(response, {
      tenantId: 'tenant-1',
      conversationId: 'conv-1',
      userMessage: 'Is this right?',
    });

    if (decision.action === EscalationAction.SEND_WITH_DISCLAIMER) {
      expect(decision.modifiedResponse).toContain('⚠️');
      expect(decision.modifiedResponse).toContain('verify with an expert');
    }
  });

  it('should handle urgent queries appropriately', async () => {
    const response: CompletionResponse = {
      id: 'test-5',
      created: Date.now(),
      model: 'gpt-4',
      content: "I'm not completely sure, but here's what I think.",
    };

    const decision = await engine.decide(response, {
      tenantId: 'tenant-1',
      conversationId: 'conv-1',
      userMessage: 'URGENT: What should I do?',
      isUrgent: true,
    });

    // For urgent queries, prefer sending response with disclaimer over immediate escalation
    expect(decision.shouldSendResponse).toBe(true);
  });
});

describe('Escalation Engine Variants', () => {
  it('should create strict engine with higher thresholds', async () => {
    const engine = createStrictEscalationEngine();
    const config = engine.getConfig();

    expect(config.rules.immediateEscalationThreshold).toBeGreaterThan(
      DEFAULT_CONFIDENCE_CONFIG.thresholds.standard
    );
  });

  it('should create lenient engine with lower thresholds', async () => {
    const engine = createLenientEscalationEngine();
    const config = engine.getConfig();

    expect(config.rules.immediateEscalationThreshold).toBeLessThan(
      DEFAULT_CONFIDENCE_CONFIG.thresholds.standard
    );
  });

  it('should allow threshold customization', async () => {
    const engine = new EscalationEngine({
      rules: {
        immediateEscalationThreshold: 0.9,
        suggestReviewThreshold: 0.95,
        addDisclaimersForMediumConfidence: false,
        disclaimerTemplate: 'Custom disclaimer',
        alwaysEscalateLevels: [],
        alwaysSendAIResponse: true,
      },
    });

    const config = engine.getConfig();
    expect(config.rules.immediateEscalationThreshold).toBe(0.9);
    expect(config.rules.alwaysSendAIResponse).toBe(true);
  });
});

describe('Integration: Full Confidence Flow', () => {
  it('should handle end-to-end confidence assessment', async () => {
    const engine = createEscalationEngine();
    const promptBuilder = engine.getPromptBuilder();

    // 1. Build prompt with confidence instructions
    const systemPrompt = 'You are a helpful assistant.';
    const augmentedPrompt = promptBuilder.augmentSystemPrompt(systemPrompt);
    expect(augmentedPrompt).toContain('Confidence Self-Assessment');

    // 2. Simulate LLM response with confidence marker
    const llmResponse: CompletionResponse = {
      id: 'test-integration',
      created: Date.now(),
      model: 'gpt-4',
      content: 'I think this might work, but you should test it first. [confidence: medium]',
    };

    // 3. Make escalation decision
    const decision = await engine.decide(llmResponse, {
      tenantId: 'tenant-1',
      conversationId: 'conv-1',
      userMessage: 'How do I fix this bug?',
    });

    // 4. Verify decision includes analysis
    expect(decision.analysis).toBeDefined();
    expect(decision.analysis.signals.length).toBeGreaterThan(0);
    expect(decision.metadata.reason).toBeTruthy();
  });

  it('should handle high-stakes medical query', async () => {
    const engine = createStrictEscalationEngine();

    const response: CompletionResponse = {
      id: 'medical-test',
      created: Date.now(),
      model: 'gpt-4',
      content: 'You might want to try this treatment, but results can vary.',
    };

    const decision = await engine.decide(response, {
      tenantId: 'tenant-1',
      conversationId: 'conv-1',
      userMessage: 'What medical treatment should I get for my diagnosis?',
      domainContext: 'medical',
    });

    // Strict engine + medical domain = likely escalation
    expect(decision.shouldNotifyHuman).toBe(true);
    expect(decision.analysis.metadata.detectedPatterns).toContain('high_stakes_domain');
  });
});
