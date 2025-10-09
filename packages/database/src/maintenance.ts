import cron, { ScheduledTask } from 'node-cron';
import { Logger } from '@meta-chat/shared';

import { getPrismaClient } from './client';

const logger = new Logger('DatabaseMaintenance');

interface PartitionTableConfig {
  name: string;
  timestampColumn: string;
  indexStatements: string[];
}

const PARTITIONED_TABLES: PartitionTableConfig[] = [
  {
    name: 'messages',
    timestampColumn: '"timestamp"',
    indexStatements: [
      '("conversationId", "timestamp")',
      '("externalId")',
      '("id")'
    ],
  },
  {
    name: 'api_logs',
    timestampColumn: '"timestamp"',
    indexStatements: [
      '("tenantId", "timestamp")',
      '("timestamp")',
      '("id")'
    ],
  },
];

export interface PartitionOptions {
  monthsBack?: number;
  monthsForward?: number;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const result = new Date(Date.UTC(year, month + months, 1));
  return result;
}

function formatDateLiteral(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatPartitionName(table: string, date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${table}_${year}_${month}`;
}

export async function ensureMonthlyPartitions(options: PartitionOptions = {}): Promise<void> {
  const prisma = getPrismaClient();
  const monthsBack = options.monthsBack ?? 6;
  const monthsForward = options.monthsForward ?? 6;

  const now = new Date();
  let cursor = startOfMonth(addMonths(now, -monthsBack));
  const end = startOfMonth(addMonths(now, monthsForward));

  for (const table of PARTITIONED_TABLES) {
    while (cursor <= end) {
      const partitionName = formatPartitionName(table.name, cursor);
      const nextMonth = addMonths(cursor, 1);
      const from = formatDateLiteral(cursor);
      const to = formatDateLiteral(nextMonth);

      const createPartitionSql = `CREATE TABLE IF NOT EXISTS "${partitionName}" PARTITION OF "${table.name}" FOR VALUES FROM ('${from}') TO ('${to}')`;
      await prisma.$executeRawUnsafe(createPartitionSql);

      for (const indexStatement of table.indexStatements) {
        const indexName = `${partitionName}_${indexStatement
          .replace(/[^a-zA-Z]+/g, '_')
          .replace(/^_+|_+$/g, '')}_idx`;
        const createIndexSql = `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${partitionName}" ${indexStatement}`;
        await prisma.$executeRawUnsafe(createIndexSql);
      }

      cursor = nextMonth;
    }

    cursor = startOfMonth(addMonths(now, -monthsBack));
  }

  logger.info('Ensured monthly partitions exist', {
    tables: PARTITIONED_TABLES.map((t) => t.name),
    range: {
      from: formatDateLiteral(startOfMonth(addMonths(now, -monthsBack))),
      to: formatDateLiteral(end),
    },
  });
}

export interface DataRetentionPolicy {
  messages: {
    retentionDays: number;
    archiveTable?: string;
  };
  apiLogs: {
    retentionDays: number;
    archiveTable?: string;
  };
}

export interface RetentionJobOptions {
  policy: DataRetentionPolicy;
  cronExpression?: string;
  timezone?: string;
  dryRun?: boolean;
}

export interface RetentionJobHandle {
  task: ScheduledTask;
  stop: () => void;
}

async function ensureArchiveTable(table: string, archiveTable?: string): Promise<void> {
  if (!archiveTable) {
    return;
  }

  const prisma = getPrismaClient();
  const sql = `CREATE TABLE IF NOT EXISTS "${archiveTable}" (LIKE "${table}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STATISTICS)`;
  await prisma.$executeRawUnsafe(sql);
}

async function archiveAndDelete(
  table: PartitionTableConfig,
  cutoff: Date,
  archiveTable?: string,
  dryRun?: boolean
): Promise<void> {
  const prisma = getPrismaClient();

  const [{ count } = { count: BigInt(0) }] = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::bigint AS count FROM "${table.name}" WHERE ${table.timestampColumn} < $1`,
    cutoff
  )) as Array<{ count: bigint }>;

  if (dryRun) {
    logger.info('Retention dry run completed', {
      table: table.name,
      cutoff: cutoff.toISOString(),
      candidates: Number(count),
    });
    return;
  }

  if (archiveTable) {
    await ensureArchiveTable(table.name, archiveTable);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${archiveTable}" SELECT * FROM "${table.name}" WHERE ${table.timestampColumn} < $1`,
      cutoff
    );
  }

  await prisma.$executeRawUnsafe(
    `DELETE FROM "${table.name}" WHERE ${table.timestampColumn} < $1`,
    cutoff
  );

  logger.info('Retention sweep completed', {
    table: table.name,
    cutoff: cutoff.toISOString(),
    deleted: Number(count),
    archived: archiveTable ? Number(count) : 0,
  });
}

export async function runDataRetentionSweep(policy: DataRetentionPolicy, dryRun?: boolean): Promise<void> {
  const now = new Date();
  const tasks: Array<Promise<void>> = [];

  const messageCutoff = new Date(now.getTime() - policy.messages.retentionDays * 24 * 60 * 60 * 1000);
  tasks.push(
    archiveAndDelete(PARTITIONED_TABLES[0], messageCutoff, policy.messages.archiveTable, dryRun)
  );

  const apiLogCutoff = new Date(now.getTime() - policy.apiLogs.retentionDays * 24 * 60 * 60 * 1000);
  tasks.push(
    archiveAndDelete(PARTITIONED_TABLES[1], apiLogCutoff, policy.apiLogs.archiveTable, dryRun)
  );

  await Promise.all(tasks);
}

export function scheduleDataRetentionJobs(options: RetentionJobOptions): RetentionJobHandle {
  const cronExpression = options.cronExpression ?? '0 3 * * *';
  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        await runDataRetentionSweep(options.policy, options.dryRun);
      } catch (error) {
        logger.error('Data retention sweep failed', error as Error);
      }
    },
    {
      timezone: options.timezone ?? 'UTC',
    }
  );

  logger.info('Scheduled data retention jobs', {
    cron: cronExpression,
    timezone: options.timezone ?? 'UTC',
    dryRun: options.dryRun ?? false,
  });

  return {
    task,
    stop: () => task.stop(),
  };
}
