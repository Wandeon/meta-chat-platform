import { createLogger } from '@meta-chat/shared';
import type { CompletionResponse, CompletionChunk } from '@meta-chat/llm';

const logger = createLogger('ConfidenceAnalyzer');

/**
 * Confidence levels for LLM responses
 */
export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  VERY_LOW = 'very_low',
}

/**
 * Individual signal from confidence analysis
 */
export interface ConfidenceSignal {
  name: string;
  score: number; // 0-1 scale
  weight: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Complete confidence analysis result
 */
export interface ConfidenceAnalysis {
  overallScore: number; // 0-1 scale
  level: ConfidenceLevel;
  signals: ConfidenceSignal[];
  shouldEscalate: boolean;
  escalationReason?: string;
  metadata: {
    analyzedAt: Date;
    responseLength: number;
    detectedPatterns: string[];
  };
}

/**
 * Configuration for confidence thresholds
 */
export interface ConfidenceThresholds {
  highStakes: number; // Stricter threshold for critical domains
  standard: number; // Normal threshold
  lowStakes: number; // Relaxed threshold
}

/**
 * Configuration for the confidence analyzer
 */
export interface ConfidenceAnalyzerConfig {
  thresholds: ConfidenceThresholds;
  enableSelfAssessment: boolean;
  enablePatternDetection: boolean;
  enableConsistencyCheck: boolean;
  highStakesDomains?: string[]; // Keywords for high-stakes topics
  weights: {
    selfAssessment: number;
    hedgingDetection: number;
    responseQuality: number;
    consistencyCheck: number;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceAnalyzerConfig = {
  thresholds: {
    highStakes: 0.8, // 80% confidence needed for medical, legal, financial
    standard: 0.6, // 60% confidence for general queries
    lowStakes: 0.4, // 40% confidence for casual chat
  },
  enableSelfAssessment: true,
  enablePatternDetection: true,
  enableConsistencyCheck: false, // Disabled by default (requires multiple samples)
  highStakesDomains: [
    'medical',
    'legal',
    'financial',
    'health',
    'diagnosis',
    'medication',
    'lawsuit',
    'investment',
    'emergency',
  ],
  weights: {
    selfAssessment: 0.5, // Primary signal
    hedgingDetection: 0.25,
    responseQuality: 0.15,
    consistencyCheck: 0.1,
  },
};

/**
 * Hedging phrases that indicate uncertainty
 */
const HEDGING_PHRASES = [
  // Direct uncertainty
  "i'm not sure",
  "i'm uncertain",
  "i don't know",
  "i cannot say",
  "i'm not confident",
  "i don't have enough information",

  // Qualifiers
  "might be",
  "could be",
  "may be",
  "possibly",
  "perhaps",
  "maybe",
  "potentially",
  "it's possible that",

  // Suggestions to seek alternatives
  "you should ask",
  "consult with",
  "speak to an expert",
  "contact a professional",
  "verify with",
  "double check",

  // Disclaimers
  "i think",
  "i believe",
  "it seems",
  "it appears",
  "from what i understand",
  "based on limited information",
  "to the best of my knowledge",

  // Explicit deferral
  "beyond my expertise",
  "outside my knowledge",
  "specialized knowledge required",
  "need more context",
  "requires expert judgment",
];

/**
 * Strong confidence phrases
 */
const CONFIDENCE_PHRASES = [
  "definitely",
  "certainly",
  "absolutely",
  "i'm confident that",
  "i'm certain that",
  "without a doubt",
  "clearly",
  "obviously",
  "undoubtedly",
];

/**
 * Analyzes LLM response confidence using multiple signals
 */
export class ConfidenceAnalyzer {
  private config: ConfidenceAnalyzerConfig;

  constructor(config?: Partial<ConfidenceAnalyzerConfig>) {
    this.config = {
      ...DEFAULT_CONFIDENCE_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_CONFIDENCE_CONFIG.weights,
        ...config?.weights,
      },
      thresholds: {
        ...DEFAULT_CONFIDENCE_CONFIG.thresholds,
        ...config?.thresholds,
      },
    };
  }

  /**
   * Analyze confidence of an LLM response
   */
  async analyze(
    response: CompletionResponse,
    context: {
      userMessage: string;
      conversationHistory?: string[];
      domainContext?: string;
    }
  ): Promise<ConfidenceAnalysis> {
    const signals: ConfidenceSignal[] = [];
    const detectedPatterns: string[] = [];

    // Signal 1: Self-assessment (if present in response)
    if (this.config.enableSelfAssessment) {
      const selfAssessment = this.extractSelfAssessment(response.content);
      if (selfAssessment) {
        signals.push({
          name: 'self_assessment',
          score: selfAssessment.score,
          weight: this.config.weights.selfAssessment,
          reason: selfAssessment.reason,
          metadata: { extractedText: selfAssessment.text },
        });
        detectedPatterns.push('self_assessment_found');
      }
    }

    // Signal 2: Hedging detection
    if (this.config.enablePatternDetection) {
      const hedging = this.detectHedging(response.content);
      signals.push({
        name: 'hedging_detection',
        score: 1 - hedging.severity, // Inverse: more hedging = lower confidence
        weight: this.config.weights.hedgingDetection,
        reason: hedging.reason,
        metadata: { phrasesFound: hedging.phrases },
      });
      if (hedging.severity > 0.5) {
        detectedPatterns.push('high_hedging');
      }
    }

    // Signal 3: Response quality indicators
    const quality = this.analyzeResponseQuality(response.content, context.userMessage);
    signals.push({
      name: 'response_quality',
      score: quality.score,
      weight: this.config.weights.responseQuality,
      reason: quality.reason,
      metadata: quality.metadata,
    });
    if (quality.score < 0.5) {
      detectedPatterns.push('low_quality');
    }

    // Calculate weighted overall score
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const overallScore = signals.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

    // Determine if this is a high-stakes domain
    const isHighStakes = this.isHighStakesDomain(context.userMessage, context.domainContext);
    if (isHighStakes) {
      detectedPatterns.push('high_stakes_domain');
    }

    // Determine confidence level
    const level = this.determineConfidenceLevel(overallScore);

    // Decide if escalation is needed
    const threshold = isHighStakes
      ? this.config.thresholds.highStakes
      : this.config.thresholds.standard;

    const shouldEscalate = overallScore < threshold;
    const escalationReason = shouldEscalate
      ? this.buildEscalationReason(overallScore, threshold, signals, isHighStakes)
      : undefined;

    const analysis: ConfidenceAnalysis = {
      overallScore,
      level,
      signals,
      shouldEscalate,
      escalationReason,
      metadata: {
        analyzedAt: new Date(),
        responseLength: response.content.length,
        detectedPatterns,
      },
    };

    logger.info('Confidence analysis completed', {
      overallScore,
      level,
      shouldEscalate,
      isHighStakes,
      signalCount: signals.length,
    });

    return analysis;
  }

  /**
   * Extract self-assessment from response if present
   * Looks for confidence markers in the response
   */
  private extractSelfAssessment(content: string): {
    score: number;
    reason: string;
    text: string;
  } | null {
    const lower = content.toLowerCase();

    // Look for explicit confidence markers
    const markers = [
      { pattern: /\[confidence:\s*(high|medium|low|very[_\s]low)\]/i, explicit: true },
      { pattern: /confidence\s*level:\s*(high|medium|low|very[_\s]low)/i, explicit: true },
      { pattern: /\(confidence:\s*([0-9]{1,3})%\)/i, explicit: true },
    ];

    for (const marker of markers) {
      const match = content.match(marker.pattern);
      if (match) {
        const value = match[1].toLowerCase();

        // Handle percentage format
        if (!isNaN(Number(value))) {
          const percentage = Number(value);
          return {
            score: percentage / 100,
            reason: `Explicit confidence percentage: ${percentage}%`,
            text: match[0],
          };
        }

        // Handle level format
        const scoreMap: Record<string, number> = {
          'high': 0.9,
          'medium': 0.6,
          'low': 0.3,
          'very low': 0.1,
          'very_low': 0.1,
        };

        return {
          score: scoreMap[value] || 0.5,
          reason: `Self-assessed confidence: ${value}`,
          text: match[0],
        };
      }
    }

    return null;
  }

  /**
   * Detect hedging language in the response
   */
  private detectHedging(content: string): {
    severity: number;
    reason: string;
    phrases: string[];
  } {
    const lower = content.toLowerCase();
    const foundHedges: string[] = [];
    const foundConfident: string[] = [];

    // Count hedging phrases
    for (const phrase of HEDGING_PHRASES) {
      if (lower.includes(phrase)) {
        foundHedges.push(phrase);
      }
    }

    // Count confidence phrases (counterbalance)
    for (const phrase of CONFIDENCE_PHRASES) {
      if (lower.includes(phrase)) {
        foundConfident.push(phrase);
      }
    }

    // Calculate severity (0-1 scale)
    const hedgeScore = Math.min(foundHedges.length / 3, 1); // Normalize: 3+ hedges = max severity
    const confidentScore = Math.min(foundConfident.length / 2, 1);
    const severity = Math.max(0, hedgeScore - confidentScore * 0.5);

    const reason = foundHedges.length > 0
      ? `Found ${foundHedges.length} hedging phrase(s)`
      : 'No significant hedging detected';

    return { severity, reason, phrases: foundHedges };
  }

  /**
   * Analyze response quality indicators
   */
  private analyzeResponseQuality(
    response: string,
    userMessage: string
  ): {
    score: number;
    reason: string;
    metadata: Record<string, unknown>;
  } {
    const factors: Array<{ name: string; score: number }> = [];

    // Factor 1: Response length appropriateness
    const lengthScore = this.scoreResponseLength(response, userMessage);
    factors.push({ name: 'length', score: lengthScore });

    // Factor 2: Question answering completeness
    const answerScore = this.scoreAnswerCompleteness(response, userMessage);
    factors.push({ name: 'completeness', score: answerScore });

    // Factor 3: Specificity vs vagueness
    const specificityScore = this.scoreSpecificity(response);
    factors.push({ name: 'specificity', score: specificityScore });

    // Average the factors
    const avgScore = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;

    return {
      score: avgScore,
      reason: `Quality factors: ${factors.map(f => `${f.name}=${f.score.toFixed(2)}`).join(', ')}`,
      metadata: { factors },
    };
  }

  /**
   * Score response length appropriateness
   */
  private scoreResponseLength(response: string, userMessage: string): number {
    const responseWords = response.split(/\s+/).length;
    const questionWords = userMessage.split(/\s+/).length;

    // Very short responses to complex questions = low confidence
    if (questionWords > 10 && responseWords < 15) {
      return 0.3;
    }

    // Excessively long responses might indicate rambling/uncertainty
    if (responseWords > 500) {
      return 0.6;
    }

    // Reasonable length
    return 0.9;
  }

  /**
   * Score answer completeness
   */
  private scoreAnswerCompleteness(response: string, userMessage: string): number {
    const lower = response.toLowerCase();

    // Direct deflection = low score
    const deflections = [
      "i can't answer",
      "i don't have that information",
      "unable to provide",
      "cannot help with",
    ];

    for (const deflection of deflections) {
      if (lower.includes(deflection)) {
        return 0.2;
      }
    }

    // Question contains '?' but response is very vague
    if (userMessage.includes('?') && lower.match(/\b(it depends|varies|unclear)\b/)) {
      return 0.5;
    }

    return 0.8;
  }

  /**
   * Score specificity of the response
   */
  private scoreSpecificity(response: string): number {
    const lower = response.toLowerCase();

    // Count specific indicators (numbers, dates, names, concrete nouns)
    const specificIndicators = [
      /\b\d+\b/, // Numbers
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, // Months
      /\b\d{4}\b/, // Years
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, // Days
    ];

    const specificityCount = specificIndicators.filter(pattern => pattern.test(response)).length;

    // Count vague phrases
    const vaguePhases = ["in general", "typically", "usually", "often", "sometimes", "various", "several"];
    const vaguenessCount = vaguePhases.filter(phrase => lower.includes(phrase)).length;

    // Score: more specific = higher score
    const score = Math.max(0.2, Math.min(1, (specificityCount * 0.2) - (vaguenessCount * 0.1) + 0.5));
    return score;
  }

  /**
   * Check if the query is in a high-stakes domain
   */
  private isHighStakesDomain(userMessage: string, domainContext?: string): boolean {
    const lower = userMessage.toLowerCase();
    const contextLower = domainContext?.toLowerCase() || '';

    return this.config.highStakesDomains!.some(
      domain => lower.includes(domain) || contextLower.includes(domain)
    );
  }

  /**
   * Determine confidence level from score
   */
  private determineConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 0.8) return ConfidenceLevel.HIGH;
    if (score >= 0.6) return ConfidenceLevel.MEDIUM;
    if (score >= 0.4) return ConfidenceLevel.LOW;
    return ConfidenceLevel.VERY_LOW;
  }

  /**
   * Build a human-readable escalation reason
   */
  private buildEscalationReason(
    score: number,
    threshold: number,
    signals: ConfidenceSignal[],
    isHighStakes: boolean
  ): string {
    const parts: string[] = [];

    parts.push(`Confidence score ${(score * 100).toFixed(1)}% is below threshold ${(threshold * 100).toFixed(1)}%`);

    if (isHighStakes) {
      parts.push('High-stakes domain detected (stricter threshold applied)');
    }

    // Include key signal reasons
    const lowSignals = signals.filter(s => s.score < 0.5);
    if (lowSignals.length > 0) {
      parts.push(`Low signals: ${lowSignals.map(s => s.name).join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConfidenceAnalyzerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      weights: {
        ...this.config.weights,
        ...config.weights,
      },
      thresholds: {
        ...this.config.thresholds,
        ...config.thresholds,
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConfidenceAnalyzerConfig {
    return { ...this.config };
  }
}
