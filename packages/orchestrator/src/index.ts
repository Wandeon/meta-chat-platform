export { QueueConsumer, QueueConsumerOptions, MessageContext } from './queue-consumer';
export { MessageOrchestrator, MessageOrchestratorOptions } from './message-orchestrator';
export { TenantConfigCache, TenantRuntimeConfig, LLMRuntimeConfiguration } from './config-cache';
export { ConversationManager } from './conversation-manager';
export { MessagePipeline } from './message-pipeline';
export { RagRetriever } from './rag-retriever';
export { ChannelAdapterRegistry, ChannelAdapter, OutboundMessage, ChannelSendResult } from './channel-adapter';
export { FunctionRegistry } from './function-registry';

// Confidence-based escalation system
export {
  ConfidenceAnalyzer,
  ConfidenceLevel,
  type ConfidenceAnalysis,
  type ConfidenceSignal,
  type ConfidenceAnalyzerConfig,
  type ConfidenceThresholds,
  DEFAULT_CONFIDENCE_CONFIG,
} from './confidence-analyzer';

export {
  ConfidencePromptBuilder,
  SelfAssessmentStrategy,
  type PromptBuilderConfig,
  DEFAULT_PROMPT_CONFIG,
  createExplicitMarkerPromptBuilder,
  createChainOfThoughtPromptBuilder,
  createUncertaintyAcknowledgmentPromptBuilder,
} from './confidence-prompt-builder';

export {
  EscalationEngine,
  EscalationAction,
  type EscalationDecision,
  type EscalationRules,
  type EscalationEngineConfig,
  type EscalationContext,
  DEFAULT_ESCALATION_CONFIG,
  createEscalationEngine,
  createStrictEscalationEngine,
  createLenientEscalationEngine,
} from './escalation-engine';

export {
  buildEscalationConfigFromTenant,
  isConfidenceEscalationEnabled,
} from './escalation-config-builder';

export { MessagePipelineWithEscalation } from './message-pipeline-with-escalation';
