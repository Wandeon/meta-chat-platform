import { getPrismaClient } from '@meta-chat/database';
const prisma = getPrismaClient();

export interface ProcessMessageOptions {
  tenantId: string;
  conversationId: string;
  messageId?: string;
  skipRAG?: boolean;
  skipStreaming?: boolean;
}

export class Orchestrator {
  async processMessage(
    message: string,
    channelType: string,
    options: ProcessMessageOptions
  ): Promise<any> {
    // Stub implementation
    return {
      response: 'This is a stub response',
      messageId: options.messageId || 'stub-id',
      sources: []
    };
  }
}

export default new Orchestrator();

// Export confidence and escalation modules
export { ConfidenceAnalyzer } from './confidence-analyzer';
export { EscalationEngine, EscalationAction } from './escalation-engine';
export { buildEscalationConfigFromTenant, isConfidenceEscalationEnabled } from './escalation-config-builder';

// Export channel adapter modules
export {
  ChannelAdapter,
  ChannelSendResult,
  OutboundMessage,
  ChannelAdapterContext,
  ChannelAdapterRegistry
} from './channel-adapter';

// Export message orchestrator
export { MessageOrchestrator } from './message-orchestrator';
export type { MessageOrchestratorOptions } from './message-orchestrator';

// Export message pipeline with escalation
export { MessagePipelineWithEscalation } from './message-pipeline-with-escalation';
