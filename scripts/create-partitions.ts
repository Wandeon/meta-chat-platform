#!/usr/bin/env tsx
/**
 * Manual script to create database partitions for the next N months
 *
 * Usage:
 *   tsx scripts/create-partitions.ts [months]
 *
 * Examples:
 *   tsx scripts/create-partitions.ts        # Create partitions for next 6 months (default)
 *   tsx scripts/create-partitions.ts 12     # Create partitions for next 12 months
 */

import 'dotenv/config';
import { ensureMonthlyPartitions, getPrismaClient } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('CreatePartitions');

async function main() {
  const monthsArg = process.argv[2];
  const months = monthsArg ? parseInt(monthsArg, 10) : 6;

  if (isNaN(months) || months < 1 || months > 60) {
    logger.error('Invalid months argument. Must be a number between 1 and 60.');
    process.exit(1);
  }

  logger.info(`Creating partitions for next ${months} months...`);

  const prisma = getPrismaClient();

  try {
    await prisma.$connect();
    logger.info('Connected to database');

    // Create partitions from now to N months forward
    await ensureMonthlyPartitions({
      monthsBack: 1,    // Also ensure current month
      monthsForward: months,
    });

    // Verify partitions were created
    const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND (tablename LIKE 'messages_%' OR tablename LIKE 'api_logs_%')
      ORDER BY tablename;
    `;

    logger.info(`Total partitions in database: ${result.length}`);
    logger.info('Partition tables:', result.map(r => r.tablename));

    logger.info('Partition creation completed successfully');
  } catch (error) {
    logger.error('Failed to create partitions', error as Error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
