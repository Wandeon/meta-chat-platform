import type { TenantSettings } from '@meta-chat/shared';
import {
  EscalationEngineConfig,
  DEFAULT_ESCALATION_CONFIG,
  ConfidenceLevel,
} from './escalation-engine';
import { SelfAssessmentStrategy } from './confidence-prompt-builder';

/**
 * Builds EscalationEngineConfig from tenant settings
 */
export function buildEscalationConfigFromTenant(
  tenantSettings: TenantSettings
): Partial<EscalationEngineConfig> | undefined {
  const escalationSettings = tenantSettings.confidenceEscalation;

  // If not configured or disabled, return undefined
  if (!escalationSettings?.enabled) {
    return undefined;
  }

  // Apply mode preset
  const modePresets = {
    strict: {
      immediateEscalationThreshold: 0.5,
      suggestReviewThreshold: 0.75,
      analyzerThresholds: {
        highStakes: 0.85,
        standard: 0.7,
        lowStakes: 0.5,
      },
    },
    standard: {
      immediateEscalationThreshold: 0.3,
      suggestReviewThreshold: 0.6,
      analyzerThresholds: {
        highStakes: 0.8,
        standard: 0.6,
        lowStakes: 0.4,
      },
    },
    lenient: {
      immediateEscalationThreshold: 0.2,
      suggestReviewThreshold: 0.4,
      analyzerThresholds: {
        highStakes: 0.7,
        standard: 0.5,
        lowStakes: 0.3,
      },
    },
  };

  const mode = escalationSettings.mode || 'standard';
  const preset = modePresets[mode];

  // Build config with tenant overrides
  const config: Partial<EscalationEngineConfig> = {
    rules: {
      immediateEscalationThreshold:
        escalationSettings.immediateEscalationThreshold ?? preset.immediateEscalationThreshold,
      suggestReviewThreshold:
        escalationSettings.suggestReviewThreshold ?? preset.suggestReviewThreshold,
      addDisclaimersForMediumConfidence:
        escalationSettings.addDisclaimers ?? DEFAULT_ESCALATION_CONFIG.rules.addDisclaimersForMediumConfidence,
      disclaimerTemplate:
        escalationSettings.disclaimerText ?? DEFAULT_ESCALATION_CONFIG.rules.disclaimerTemplate,
      alwaysEscalateLevels: [ConfidenceLevel.VERY_LOW],
      alwaysSendAIResponse: false,
    },
    analyzerConfig: {
      thresholds: preset.analyzerThresholds,
      enableSelfAssessment: true,
      enablePatternDetection: true,
      enableConsistencyCheck: false,
      highStakesDomains: [
        ...(DEFAULT_ESCALATION_CONFIG.analyzerConfig?.highStakesDomains || []),
        ...(escalationSettings.highStakesDomains || []),
      ],
      weights: DEFAULT_ESCALATION_CONFIG.analyzerConfig?.weights,
    },
    promptBuilderConfig: {
      strategy: mapStrategyFromString(escalationSettings.selfAssessmentStrategy),
      includeInstructions: true,
      instructionPlacement: 'system',
    },
    enableLogging: true,
  };

  return config;
}

/**
 * Map string strategy to enum
 */
function mapStrategyFromString(
  strategy?: string
): SelfAssessmentStrategy {
  switch (strategy) {
    case 'chain_of_thought':
      return SelfAssessmentStrategy.CHAIN_OF_THOUGHT;
    case 'uncertainty_acknowledgment':
      return SelfAssessmentStrategy.UNCERTAINTY_ACKNOWLEDGMENT;
    case 'explicit_marker':
    default:
      return SelfAssessmentStrategy.EXPLICIT_MARKER;
  }
}

/**
 * Check if confidence escalation is enabled for tenant
 */
export function isConfidenceEscalationEnabled(
  tenantSettings: TenantSettings
): boolean {
  return tenantSettings.confidenceEscalation?.enabled ?? false;
}
