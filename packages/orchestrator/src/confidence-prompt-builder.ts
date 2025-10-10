import type { CompletionMessage } from '@meta-chat/llm';

/**
 * Strategies for prompting the LLM to self-assess confidence
 */
export enum SelfAssessmentStrategy {
  /**
   * Explicit marker in response - LLM includes [confidence: level] tag
   */
  EXPLICIT_MARKER = 'explicit_marker',

  /**
   * Chain-of-thought reasoning - LLM explains reasoning before answering
   */
  CHAIN_OF_THOUGHT = 'chain_of_thought',

  /**
   * Post-response reflection - LLM reflects on confidence after answering
   */
  POST_REFLECTION = 'post_reflection',

  /**
   * Uncertainty acknowledgment - LLM explicitly states when uncertain
   */
  UNCERTAINTY_ACKNOWLEDGMENT = 'uncertainty_acknowledgment',
}

/**
 * Configuration for prompt building
 */
export interface PromptBuilderConfig {
  strategy: SelfAssessmentStrategy;
  includeInstructions: boolean;
  instructionPlacement: 'system' | 'user';
}

/**
 * Default configuration
 */
export const DEFAULT_PROMPT_CONFIG: PromptBuilderConfig = {
  strategy: SelfAssessmentStrategy.EXPLICIT_MARKER,
  includeInstructions: true,
  instructionPlacement: 'system',
};

/**
 * Builds prompts that elicit confidence self-assessment from LLMs
 */
export class ConfidencePromptBuilder {
  private config: PromptBuilderConfig;

  constructor(config?: Partial<PromptBuilderConfig>) {
    this.config = {
      ...DEFAULT_PROMPT_CONFIG,
      ...config,
    };
  }

  /**
   * Augment system prompt with confidence assessment instructions
   */
  augmentSystemPrompt(baseSystemPrompt: string): string {
    if (!this.config.includeInstructions || this.config.instructionPlacement !== 'system') {
      return baseSystemPrompt;
    }

    const instructions = this.getInstructions();
    return `${baseSystemPrompt}\n\n${instructions}`;
  }

  /**
   * Augment user message with confidence assessment instructions
   */
  augmentUserMessage(userMessage: string): string {
    if (!this.config.includeInstructions || this.config.instructionPlacement !== 'user') {
      return userMessage;
    }

    const instructions = this.getInstructions();
    return `${userMessage}\n\n${instructions}`;
  }

  /**
   * Augment full message array (useful when you want to add confidence assessment later)
   */
  augmentMessages(messages: CompletionMessage[]): CompletionMessage[] {
    if (!this.config.includeInstructions) {
      return messages;
    }

    const augmented = [...messages];

    if (this.config.instructionPlacement === 'system') {
      // Find first system message and augment it
      const systemIndex = augmented.findIndex(m => m.role === 'system');
      if (systemIndex !== -1) {
        augmented[systemIndex] = {
          ...augmented[systemIndex],
          content: this.augmentSystemPrompt(augmented[systemIndex].content),
        };
      } else {
        // No system message, add one
        augmented.unshift({
          role: 'system',
          content: this.getInstructions(),
        });
      }
    } else {
      // Augment the last user message
      const lastUserIndex = augmented.map(m => m.role).lastIndexOf('user');
      if (lastUserIndex !== -1) {
        augmented[lastUserIndex] = {
          ...augmented[lastUserIndex],
          content: this.augmentUserMessage(augmented[lastUserIndex].content),
        };
      }
    }

    return augmented;
  }

  /**
   * Get instructions based on strategy
   */
  private getInstructions(): string {
    switch (this.config.strategy) {
      case SelfAssessmentStrategy.EXPLICIT_MARKER:
        return this.getExplicitMarkerInstructions();

      case SelfAssessmentStrategy.CHAIN_OF_THOUGHT:
        return this.getChainOfThoughtInstructions();

      case SelfAssessmentStrategy.POST_REFLECTION:
        return this.getPostReflectionInstructions();

      case SelfAssessmentStrategy.UNCERTAINTY_ACKNOWLEDGMENT:
        return this.getUncertaintyAcknowledgmentInstructions();

      default:
        return this.getExplicitMarkerInstructions();
    }
  }

  /**
   * Instructions for explicit marker strategy
   */
  private getExplicitMarkerInstructions(): string {
    return `## Confidence Self-Assessment

After formulating your response, assess your confidence in the answer's accuracy and completeness:

- **HIGH**: You have clear, factual knowledge and are certain of the answer
- **MEDIUM**: You can answer but have some uncertainty or missing context
- **LOW**: You have limited knowledge or significant uncertainty
- **VERY_LOW**: You should defer to a human expert

IMPORTANT: If your confidence is MEDIUM, LOW, or VERY_LOW, include this tag at the END of your response:
[confidence: <level>]

Examples:
- "The capital of France is Paris." (no tag needed - high confidence)
- "The treatment might involve antibiotics, but I'm not entirely sure. [confidence: medium]"
- "I don't have enough information about this rare medical condition. [confidence: low]"

For HIGH-STAKES topics (medical, legal, financial), be extra cautious and use MEDIUM or LOW confidence when appropriate.`;
  }

  /**
   * Instructions for chain-of-thought strategy
   */
  private getChainOfThoughtInstructions(): string {
    return `## Transparent Reasoning

Before providing your final answer, briefly explain your reasoning process:

1. What information do you have about this topic?
2. What are you certain about vs. uncertain about?
3. Are there any gaps in your knowledge?
4. How confident are you in your conclusion?

Then provide your answer. If you identify significant uncertainty or knowledge gaps during your reasoning, explicitly state that a human expert should be consulted.

Example:
"Based on my knowledge: [reasoning here]. However, I'm uncertain about [specific aspect]. Confidence: Medium. Consider consulting a specialist for verification."`;
  }

  /**
   * Instructions for post-reflection strategy
   */
  private getPostReflectionInstructions(): string {
    return `## Post-Response Reflection

After providing your answer, add a brief reflection section that assesses:

1. How confident are you in this answer? (High/Medium/Low)
2. What assumptions did you make?
3. What additional information would improve your answer?
4. Should the user seek expert verification?

Format:
---
Reflection: [Your honest assessment here]
Confidence: [High/Medium/Low]
Recommendation: [Whether to seek expert verification]
---`;
  }

  /**
   * Instructions for uncertainty acknowledgment strategy
   */
  private getUncertaintyAcknowledgmentInstructions(): string {
    return `## Honesty About Uncertainty

It's critical that you are honest about the limits of your knowledge:

- If you're NOT CERTAIN, explicitly say so using phrases like:
  - "I'm not entirely sure, but..."
  - "Based on limited information..."
  - "This is outside my core expertise..."
  - "I recommend consulting an expert because..."

- For HIGH-STAKES topics (medical advice, legal matters, financial decisions):
  - Be especially cautious
  - Explicitly recommend professional consultation
  - Don't provide advice that could cause harm if incorrect

- If you DON'T KNOW something:
  - Say "I don't know" directly
  - Don't guess or speculate
  - Suggest where the user can find reliable information

Remember: It's better to admit uncertainty than to provide confident but incorrect information.`;
  }

  /**
   * Extract confidence assessment from LLM response
   * (Used by ConfidenceAnalyzer)
   */
  static extractConfidenceMarker(content: string): {
    confidence?: 'high' | 'medium' | 'low' | 'very_low';
    cleanedContent: string;
  } {
    // Match [confidence: level] pattern
    const markerPattern = /\[confidence:\s*(high|medium|low|very[_\s]low)\]/i;
    const match = content.match(markerPattern);

    if (match) {
      const confidence = match[1].toLowerCase().replace(/\s+/g, '_') as 'high' | 'medium' | 'low' | 'very_low';
      const cleanedContent = content.replace(markerPattern, '').trim();
      return { confidence, cleanedContent };
    }

    return { cleanedContent: content };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PromptBuilderConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): PromptBuilderConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function to create a prompt builder with explicit marker strategy
 */
export function createExplicitMarkerPromptBuilder(): ConfidencePromptBuilder {
  return new ConfidencePromptBuilder({
    strategy: SelfAssessmentStrategy.EXPLICIT_MARKER,
    includeInstructions: true,
    instructionPlacement: 'system',
  });
}

/**
 * Convenience function to create a prompt builder with chain-of-thought strategy
 */
export function createChainOfThoughtPromptBuilder(): ConfidencePromptBuilder {
  return new ConfidencePromptBuilder({
    strategy: SelfAssessmentStrategy.CHAIN_OF_THOUGHT,
    includeInstructions: true,
    instructionPlacement: 'system',
  });
}

/**
 * Convenience function to create a prompt builder with uncertainty acknowledgment strategy
 */
export function createUncertaintyAcknowledgmentPromptBuilder(): ConfidencePromptBuilder {
  return new ConfidencePromptBuilder({
    strategy: SelfAssessmentStrategy.UNCERTAINTY_ACKNOWLEDGMENT,
    includeInstructions: true,
    instructionPlacement: 'system',
  });
}
