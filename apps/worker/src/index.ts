import 'dotenv/config';
import { getPrismaClient, startPartitionScheduler } from '@meta-chat/database';
import { MessageOrchestrator, ChannelAdapterRegistry } from '@meta-chat/orchestrator';
import { MessagePipelineWithEscalation } from '@meta-chat/orchestrator';
import { createLogger, ChannelType } from '@meta-chat/shared';
import { WhatsAppAdapterWrapper, MessengerAdapterWrapper } from './channel-adapters';

const logger = createLogger('Worker');
const prisma = getPrismaClient();

interface WorkerConfig {
  visibilityTimeoutMs: number;
  maxRetries: number;
  prefetch: number;
  enableConfidenceEscalation: boolean;
}

const config: WorkerConfig = {
  visibilityTimeoutMs: Number(process.env.WORKER_VISIBILITY_TIMEOUT_MS) || 300000, // 5 minutes
  maxRetries: Number(process.env.WORKER_MAX_RETRIES) || 3,
  prefetch: Number(process.env.WORKER_PREFETCH) || 5,
  enableConfidenceEscalation: process.env.ENABLE_CONFIDENCE_ESCALATION !== 'false', // Enabled by default
};

const orchestrators: MessageOrchestrator[] = [];
let partitionSchedulerHandle: ReturnType<typeof startPartitionScheduler> | null = null;

// Create and configure channel adapter registry
const channelAdapterRegistry = new ChannelAdapterRegistry();
channelAdapterRegistry.register('whatsapp', new WhatsAppAdapterWrapper());
channelAdapterRegistry.register('messenger', new MessengerAdapterWrapper());

logger.info('Registered channel adapters: whatsapp, messenger');

/**
 * Start orchestrators for all active tenants and their enabled channels
 */
async function startOrchestrators() {
  logger.info('Starting message orchestrators...');

  // Fetch all enabled tenants
  const tenants = await prisma.tenant.findMany({
    where: { enabled: true },
    select: {
      id: true,
      name: true,
      settings: true,
    },
  });

  logger.info(`Found ${tenants.length} enabled tenant(s)`);

  for (const tenant of tenants) {
    const settings = (tenant.settings as any) || {};

    // Determine which channels are enabled for this tenant
    const channels: ChannelType[] = [];

    // Check if each channel type is enabled
    if (settings.whatsapp?.enabled) {
      channels.push('whatsapp');
    }
    if (settings.messenger?.enabled) {
      channels.push('messenger');
    }
    if (settings.webchat?.enabled) {
      channels.push('webchat');
    }

    // If no specific channels configured, enable webchat by default
    if (channels.length === 0) {
      channels.push('webchat');
    }

    logger.info(`Tenant ${tenant.name} (${tenant.id}): Enabling channels: ${channels.join(', ')}`);

    // Start an orchestrator for each channel
    for (const channel of channels) {
      try {
        const orchestrator = new MessageOrchestrator({
          tenantId: tenant.id,
          channel,
          visibilityTimeoutMs: config.visibilityTimeoutMs,
          maxRetries: config.maxRetries,
          prefetch: config.prefetch,
          handler: async (message) => {
            // Create pipeline with confidence escalation
            const pipeline = new MessagePipelineWithEscalation({
              tenantId: tenant.id,
              channel,
              channelAdapters: channelAdapterRegistry,
              enableConfidenceEscalation: config.enableConfidenceEscalation,
            });

            // Process the message through the pipeline
            await pipeline.process(message);
          },
        });

        await orchestrator.start();
        orchestrators.push(orchestrator);

        logger.info(`Started orchestrator for ${tenant.name}:${channel}`);
      } catch (error) {
        logger.error(`Failed to start orchestrator for ${tenant.name}:${channel}`, error as Error);
      }
    }
  }

  logger.info(`Successfully started ${orchestrators.length} orchestrator(s)`);
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down worker...');

  // Stop partition scheduler
  if (partitionSchedulerHandle) {
    try {
      partitionSchedulerHandle.stop();
      logger.info('Stopped partition scheduler');
    } catch (error) {
      logger.error('Error stopping partition scheduler', error as Error);
    }
  }

  // Stop all orchestrators
  for (const orchestrator of orchestrators) {
    try {
      await orchestrator.stop();
    } catch (error) {
      logger.error('Error stopping orchestrator', error as Error);
    }
  }

  // Disconnect from database
  await prisma.$disconnect();

  logger.info('Worker shutdown complete');
  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  logger.info('Meta Chat Worker starting...', {
    nodeEnv: process.env.NODE_ENV,
    enableConfidenceEscalation: config.enableConfidenceEscalation,
    visibilityTimeoutMs: config.visibilityTimeoutMs,
    maxRetries: config.maxRetries,
    prefetch: config.prefetch,
  });

  // Validate required environment variables
  const requiredEnvVars = ['DATABASE_URL', 'RABBITMQ_URL'];
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    process.exit(1);
  }

  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');

    // Start partition scheduler
    logger.info('Starting partition scheduler...');
    partitionSchedulerHandle = startPartitionScheduler({
      cronExpression: '0 2 1,15 * *', // 1st and 15th of each month at 2 AM
      timezone: 'UTC',
      monthsForward: 12, // Create partitions 12 months ahead
      monthsBack: 6,     // Maintain 6 months of historical partitions
    });
    logger.info('Partition scheduler started');

    // Start orchestrators for all tenants
    await startOrchestrators();

    logger.info('Worker is running and processing messages');
  } catch (error) {
    logger.error('Failed to start worker', error as Error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  shutdown();
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', reason as Error);
  shutdown();
});

// Start the worker
main().catch((error) => {
  logger.error('Fatal error during startup', error);
  process.exit(1);
});
