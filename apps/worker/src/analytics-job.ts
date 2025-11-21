import 'dotenv/config';
import { getPrismaClient } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';
import { aggregateAnalytics } from './jobs/aggregateAnalytics';
import cron from 'node-cron';

const logger = createLogger('AnalyticsJob');
const prisma = getPrismaClient();

// Health status tracking
let lastRunTime: Date | null = null;
let lastRunStatus: 'success' | 'failed' | 'running' = 'success';
let lastRunError: string | null = null;
let isRunning = false;

/**
 * Run analytics aggregation job
 */
async function runAggregation(manual = false) {
  if (isRunning) {
    logger.warn('Analytics aggregation already running, skipping...');
    return { success: false, message: 'Job already running' };
  }

  isRunning = true;
  lastRunStatus = 'running';
  const startTime = new Date();

  try {
    logger.info(`Starting analytics aggregation (${manual ? 'manual' : 'scheduled'})`);
    await aggregateAnalytics(prisma);

    lastRunTime = new Date();
    lastRunStatus = 'success';
    lastRunError = null;
    isRunning = false;

    const duration = Date.now() - startTime.getTime();
    logger.info(`Analytics aggregation completed successfully in ${duration}ms`);

    return {
      success: true,
      message: 'Analytics aggregation completed',
      duration,
      timestamp: lastRunTime
    };
  } catch (error) {
    lastRunTime = new Date();
    lastRunStatus = 'failed';
    lastRunError = error instanceof Error ? error.message : 'Unknown error';
    isRunning = false;

    logger.error('Analytics aggregation failed:', error as Error);

    return {
      success: false,
      message: 'Analytics aggregation failed',
      error: lastRunError,
      timestamp: lastRunTime
    };
  }
}

/**
 * Manual trigger function for API endpoint
 */
export async function triggerManualRun() {
  return await runAggregation(true);
}

/**
 * Schedule analytics aggregation job
 * Cron expression: 0 2 * * * (Daily at 2:00 AM)
 */
let cronTask: cron.ScheduledTask | null = null;

function scheduleCronJob() {
  const cronExpression = process.env.ANALYTICS_CRON || '0 2 * * *';

  logger.info(`Scheduling analytics job with cron: ${cronExpression}`);

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression: ${cronExpression}`);
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  cronTask = cron.schedule(cronExpression, async () => {
    await runAggregation(false);
  }, {
    timezone: 'UTC'
  });

  logger.info('Analytics cron job scheduled successfully');
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down analytics job...');

  if (cronTask) {
    cronTask.stop();
    logger.info('Stopped cron job');
  }

  // Wait for running job to complete
  if (isRunning) {
    logger.info('Waiting for running job to complete...');
    let attempts = 0;
    while (isRunning && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }

  await prisma.$disconnect();
  logger.info('Analytics job shutdown complete');
  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  logger.info('Analytics Job starting...', {
    nodeEnv: process.env.NODE_ENV,
    cronSchedule: process.env.ANALYTICS_CRON || '0 2 * * *',
  });

  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    logger.error('Missing required DATABASE_URL environment variable');
    process.exit(1);
  }

  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to database');

    // Schedule the cron job
    scheduleCronJob();

    logger.info('Analytics job is running and scheduled');

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    logger.error('Failed to start analytics job', error as Error);
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

/**
 * Get health status for monitoring
 */
export function getHealthStatus() {
  return {
    status: lastRunStatus,
    lastRunTime,
    lastRunError,
    isRunning,
    cronSchedule: '0 2 * * *',
    nextRun: cronTask ? 'Scheduled' : 'Not scheduled',
  };
}

// Start the analytics job only if this is the main module
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error during startup', error);
    process.exit(1);
  });
}
