import { createLogger, EventType } from '@meta-chat/shared';
import type { CompletionResponse } from '@meta-chat/llm';
import type { EventManager } from '@meta-chat/events';
import {
  ConfidenceAnalyzer,
  ConfidenceAnalysis,
  ConfidenceLevel,
  type ConfidenceAnalyzerConfig,
} from './confidence-analyzer';
import { ConfidencePromptBuilder, type PromptBuilderConfig } from './confidence-prompt-builder';

const logger = createLogger('EscalationEngine');

// Re-export ConfidenceLevel for convenience
export { ConfidenceLevel } from './confidence-analyzer';

/**
 * Escalation action to take when confidence is low
 */
export enum EscalationAction {
  /**
   * Continue with AI response, no escalation needed
   */
  CONTINUE = 'continue',

  /**
   * Suggest human review but send AI response
   */
  SUGGEST_REVIEW = 'suggest_review',

  /**
   * Immediately escalate to human, don't send AI response
   */
  IMMEDIATE_ESCALATION = 'immediate_escalation',

  /**
   * Send AI response with disclaimer about uncertainty
   */
  SEND_WITH_DISCLAIMER = 'send_with_disclaimer',
}

/**
 * Result of escalation decision
 */
export interface EscalationDecision {
  action: EscalationAction;
  analysis: ConfidenceAnalysis;
  shouldSendResponse: boolean;
  shouldNotifyHuman: boolean;
  modifiedResponse?: string; // Response with disclaimer added if needed
  metadata: {
    decidedAt: Date;
    reason: string;
  };
}

/**
 * Configuration for escalation rules
 */
export interface EscalationRules {
  /**
   * Confidence threshold below which to escalate immediately (no AI response sent)
   */
  immediateEscalationThreshold: number;

  /**
   * Confidence threshold below which to suggest review (send response + notify)
   */
  suggestReviewThreshold: number;

  /**
   * Whether to add disclaimers to medium-confidence responses
   */
  addDisclaimersForMediumConfidence: boolean;

  /**
   * Disclaimer template
   */
  disclaimerTemplate: string;

  /**
   * Always escalate for specific confidence levels
   */
  alwaysEscalateLevels: ConfidenceLevel[];

  /**
   * Override: always send AI response even when escalating
   */
  alwaysSendAIResponse: boolean;
}

/**
 * Configuration for the escalation engine
 */
export interface EscalationEngineConfig {
  rules: EscalationRules;
  analyzerConfig?: Partial<ConfidenceAnalyzerConfig>;
  promptBuilderConfig?: Partial<PromptBuilderConfig>;
  enableLogging: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_ESCALATION_CONFIG: EscalationEngineConfig = {
  rules: {
    immediateEscalationThreshold: 0.3, // <30% confidence = immediate escalation
    suggestReviewThreshold: 0.6, // <60% confidence = suggest review
    addDisclaimersForMediumConfidence: true,
    disclaimerTemplate: '\n\n---\n⚠️ Note: I may not have complete information about this topic. Please verify with an expert if this is important.',
    alwaysEscalateLevels: [ConfidenceLevel.VERY_LOW],
    alwaysSendAIResponse: false,
  },
  enableLogging: true,
};

/**
 * Context for making escalation decisions
 */
export interface EscalationContext {
  tenantId: string;
  conversationId: string;
  userMessage: string;
  conversationHistory?: string[];
  domainContext?: string;
  isUrgent?: boolean;
}

/**
 * Engine that orchestrates confidence analysis and escalation decisions
 */
export class EscalationEngine {
  private config: EscalationEngineConfig;
  private analyzer: ConfidenceAnalyzer;
  private promptBuilder: ConfidencePromptBuilder;
  private eventManager?: EventManager;

  constructor(config?: Partial<EscalationEngineConfig>, eventManager?: EventManager) {
    this.config = {
      ...DEFAULT_ESCALATION_CONFIG,
      ...config,
      rules: {
        ...DEFAULT_ESCALATION_CONFIG.rules,
        ...config?.rules,
      },
    };

    this.analyzer = new ConfidenceAnalyzer(this.config.analyzerConfig);
    this.promptBuilder = new ConfidencePromptBuilder(this.config.promptBuilderConfig);
    this.eventManager = eventManager;

    logger.info('EscalationEngine initialized', {
      immediateThreshold: this.config.rules.immediateEscalationThreshold,
      suggestThreshold: this.config.rules.suggestReviewThreshold,
    });
  }

  /**
   * Analyze response and decide on escalation action
   */
  async decide(
    response: CompletionResponse,
    context: EscalationContext
  ): Promise<EscalationDecision> {
    // Run confidence analysis
    const analysis = await this.analyzer.analyze(response, {
      userMessage: context.userMessage,
      conversationHistory: context.conversationHistory,
      domainContext: context.domainContext,
    });

    // Determine action based on analysis and rules
    const action = this.determineAction(analysis, context);

    // Build decision
    const decision: EscalationDecision = {
      action,
      analysis,
      shouldSendResponse: this.shouldSendResponse(action),
      shouldNotifyHuman: this.shouldNotifyHuman(action),
      modifiedResponse: this.modifyResponse(response.content, action, analysis),
      metadata: {
        decidedAt: new Date(),
        reason: this.buildDecisionReason(action, analysis),
      },
    };

    // Log decision
    if (this.config.enableLogging) {
      logger.info('Escalation decision made', {
        tenantId: context.tenantId,
        conversationId: context.conversationId,
        action,
        confidenceScore: analysis.overallScore,
        confidenceLevel: analysis.level,
        shouldEscalate: analysis.shouldEscalate,
      });
    }

    // Emit event if escalation is needed
    if (decision.shouldNotifyHuman && this.eventManager) {
      await this.emitEscalationEvent(decision, context);
    }

    return decision;
  }

  /**
   * Get the prompt builder for augmenting prompts
   */
  getPromptBuilder(): ConfidencePromptBuilder {
    return this.promptBuilder;
  }

  /**
   * Get the confidence analyzer
   */
  getAnalyzer(): ConfidenceAnalyzer {
    return this.analyzer;
  }

  /**
   * Determine escalation action based on analysis
   */
  private determineAction(analysis: ConfidenceAnalysis, context: EscalationContext): EscalationAction {
    const { overallScore, level } = analysis;
    const rules = this.config.rules;

    // Rule 1: Always escalate for specific levels
    if (rules.alwaysEscalateLevels.includes(level)) {
      return EscalationAction.IMMEDIATE_ESCALATION;
    }

    // Rule 2: Immediate escalation for very low confidence
    if (overallScore < rules.immediateEscalationThreshold) {
      return EscalationAction.IMMEDIATE_ESCALATION;
    }

    // Rule 3: Suggest review for low-medium confidence
    if (overallScore < rules.suggestReviewThreshold) {
      // If it's urgent, prefer sending response with disclaimer
      if (context.isUrgent) {
        return EscalationAction.SEND_WITH_DISCLAIMER;
      }
      return EscalationAction.SUGGEST_REVIEW;
    }

    // Rule 4: Add disclaimer for medium confidence if enabled
    if (
      level === ConfidenceLevel.MEDIUM &&
      rules.addDisclaimersForMediumConfidence
    ) {
      return EscalationAction.SEND_WITH_DISCLAIMER;
    }

    // Rule 5: High confidence - continue normally
    return EscalationAction.CONTINUE;
  }

  /**
   * Determine if AI response should be sent
   */
  private shouldSendResponse(action: EscalationAction): boolean {
    if (this.config.rules.alwaysSendAIResponse) {
      return true;
    }

    return action !== EscalationAction.IMMEDIATE_ESCALATION;
  }

  /**
   * Determine if human should be notified
   */
  private shouldNotifyHuman(action: EscalationAction): boolean {
    return (
      action === EscalationAction.IMMEDIATE_ESCALATION ||
      action === EscalationAction.SUGGEST_REVIEW
    );
  }

  /**
   * Modify response based on action (add disclaimers, etc.)
   */
  private modifyResponse(
    content: string,
    action: EscalationAction,
    analysis: ConfidenceAnalysis
  ): string | undefined {
    if (action === EscalationAction.IMMEDIATE_ESCALATION) {
      // Don't send AI response, return undefined
      return undefined;
    }

    if (
      action === EscalationAction.SEND_WITH_DISCLAIMER ||
      action === EscalationAction.SUGGEST_REVIEW
    ) {
      // Add disclaimer
      return content + this.config.rules.disclaimerTemplate;
    }

    // No modification needed
    return content;
  }

  /**
   * Build human-readable reason for decision
   */
  private buildDecisionReason(action: EscalationAction, analysis: ConfidenceAnalysis): string {
    const parts: string[] = [];

    parts.push(`Action: ${action}`);
    parts.push(`Confidence: ${analysis.level} (${(analysis.overallScore * 100).toFixed(1)}%)`);

    if (analysis.shouldEscalate && analysis.escalationReason) {
      parts.push(analysis.escalationReason);
    }

    return parts.join('. ');
  }

  /**
   * Emit escalation event
   */
  private async emitEscalationEvent(
    decision: EscalationDecision,
    context: EscalationContext
  ): Promise<void> {
    if (!this.eventManager) {
      return;
    }

    try {
      await this.eventManager.emit({
        type: EventType.HUMAN_HANDOFF_REQUESTED,
        tenantId: context.tenantId,
        timestamp: new Date(),
        data: {
          conversationId: context.conversationId,
          reason: 'low_confidence',
          confidenceScore: decision.analysis.overallScore,
          confidenceLevel: decision.analysis.level,
          escalationAction: decision.action,
          signals: decision.analysis.signals.map(s => ({
            name: s.name,
            score: s.score,
            reason: s.reason,
          })),
          metadata: decision.analysis.metadata,
        },
      });

      logger.info('Escalation event emitted', {
        tenantId: context.tenantId,
        conversationId: context.conversationId,
        action: decision.action,
      });
    } catch (error) {
      logger.error('Failed to emit escalation event', {
        tenantId: context.tenantId,
        conversationId: context.conversationId,
        error,
      });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EscalationEngineConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      rules: {
        ...this.config.rules,
        ...config.rules,
      },
    };

    if (config.analyzerConfig) {
      this.analyzer.updateConfig(config.analyzerConfig);
    }

    if (config.promptBuilderConfig) {
      this.promptBuilder.updateConfig(config.promptBuilderConfig);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): EscalationEngineConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function to create an escalation engine with default config
 */
export function createEscalationEngine(
  eventManager?: EventManager
): EscalationEngine {
  return new EscalationEngine(undefined, eventManager);
}

/**
 * Convenience function to create a strict escalation engine (higher thresholds)
 */
export function createStrictEscalationEngine(
  eventManager?: EventManager
): EscalationEngine {
  return new EscalationEngine(
    {
      rules: {
        ...DEFAULT_ESCALATION_CONFIG.rules,
        immediateEscalationThreshold: 0.5, // <50% = immediate
        suggestReviewThreshold: 0.75, // <75% = suggest review
      },
      analyzerConfig: {
        thresholds: {
          highStakes: 0.85,
          standard: 0.7,
          lowStakes: 0.5,
        },
      },
    },
    eventManager
  );
}

/**
 * Convenience function to create a lenient escalation engine (lower thresholds)
 */
export function createLenientEscalationEngine(
  eventManager?: EventManager
): EscalationEngine {
  return new EscalationEngine(
    {
      rules: {
        ...DEFAULT_ESCALATION_CONFIG.rules,
        immediateEscalationThreshold: 0.2, // <20% = immediate
        suggestReviewThreshold: 0.4, // <40% = suggest review
        addDisclaimersForMediumConfidence: false,
      },
      analyzerConfig: {
        thresholds: {
          highStakes: 0.7,
          standard: 0.5,
          lowStakes: 0.3,
        },
      },
    },
    eventManager
  );
}
