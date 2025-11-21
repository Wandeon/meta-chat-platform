import cron, { ScheduledTask } from 'node-cron';
import { createLogger } from '@meta-chat/shared';
import { ensureMonthlyPartitions, type PartitionOptions } from './maintenance';

const logger = createLogger('PartitionScheduler');

export interface PartitionSchedulerOptions {
  /**
   * How often to run partition check (cron expression)
   * Default: '0 2 1,15 * *' (1st and 15th of each month at 2 AM)
   */
  cronExpression?: string;
  
  /**
   * Timezone for cron schedule
   * Default: 'UTC'
   */
  timezone?: string;
  
  /**
   * Number of months of partitions to create in advance
   * Default: 6 months forward
   */
  monthsForward?: number;
  
  /**
   * Number of months of historical partitions to maintain
   * Default: 6 months back
   */
  monthsBack?: number;
}

export interface PartitionSchedulerHandle {
  task: ScheduledTask;
  stop: () => void;
}

/**
 * Create next month's partition manually
 * This can be called directly for one-time partition creation
 */
export async function createNextMonthPartition(): Promise<void> {
  try {
    logger.info('Creating next month partition');
    
    // Create partitions for current month + 6 months forward
    await ensureMonthlyPartitions({
      monthsBack: 0,
      monthsForward: 6,
    });
    
    logger.info('Successfully created next month partitions');
  } catch (error) {
    logger.error('Failed to create next month partition', error as Error);
    throw error;
  }
}

/**
 * Start automatic partition scheduler
 * Runs on 1st and 15th of each month at 2 AM by default
 */
export function startPartitionScheduler(options: PartitionSchedulerOptions = {}): PartitionSchedulerHandle {
  const {
    cronExpression = '0 2 1,15 * *', // 1st and 15th at 2 AM
    timezone = 'UTC',
    monthsForward = 6,
    monthsBack = 6,
  } = options;

  const partitionOptions: PartitionOptions = {
    monthsForward,
    monthsBack,
  };

  // Run immediately on startup to ensure partitions exist
  logger.info('Running initial partition check on startup');
  ensureMonthlyPartitions(partitionOptions).catch((error) => {
    logger.error('Initial partition check failed', error as Error);
  });

  // Schedule regular partition checks
  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        logger.info('Running scheduled partition check', { cron: cronExpression });
        await ensureMonthlyPartitions(partitionOptions);
        logger.info('Scheduled partition check completed successfully');
      } catch (error) {
        logger.error('Scheduled partition check failed', error as Error);
        // Log error but don't crash the scheduler
      }
    },
    {
      timezone,
      scheduled: true,
    }
  );

  logger.info('Partition scheduler started', {
    cronExpression,
    timezone,
    monthsForward,
    monthsBack,
  });

  return {
    task,
    stop: () => {
      task.stop();
      logger.info('Partition scheduler stopped');
    },
  };
}

/**
 * Create partitions for next N months
 * Useful for initial setup or bulk partition creation
 */
export async function createPartitionsForMonths(months: number): Promise<void> {
  try {
    logger.info('Creating partitions for multiple months', { months });
    
    await ensureMonthlyPartitions({
      monthsBack: 0,
      monthsForward: months,
    });
    
    logger.info('Successfully created partitions for multiple months', { months });
  } catch (error) {
    logger.error('Failed to create partitions for multiple months', error as Error);
    throw error;
  }
}
