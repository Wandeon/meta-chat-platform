import path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMqContainer, StartedRabbitMqContainer } from '@testcontainers/rabbitmq';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(execCallback);

export interface IntegrationTestContext {
  prisma: PrismaClient;
  postgres: StartedPostgreSqlContainer;
  rabbit: StartedRabbitMqContainer;
}

const context: IntegrationTestContext = {
  prisma: undefined as unknown as PrismaClient,
  postgres: undefined as unknown as StartedPostgreSqlContainer,
  rabbit: undefined as unknown as StartedRabbitMqContainer,
};

export function getIntegrationTestContext(): IntegrationTestContext {
  if (!context.prisma) {
    throw new Error('Integration test context is not initialised yet');
  }
  return context;
}

async function runMigrations(databaseUrl: string): Promise<void> {
  const cwd = path.resolve(__dirname, '../../../packages/database');
  await execAsync('npx prisma migrate deploy', {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

async function truncateDatabase(prisma: PrismaClient): Promise<void> {
  const tables = [
    '"messages"',
    '"conversations"',
    '"chunks"',
    '"documents"',
    '"events"',
    '"webhooks"',
    '"channel_secrets"',
    '"channels"',
    '"tenant_secrets"',
    '"tenant_api_keys"',
    '"password_reset_tokens"',
    '"verification_tokens"',
    '"tenant_users"',
    '"tenants"',
    '"admin_api_keys"',
    '"admin_users"',
    '"api_logs"',
    '"admin_audit_logs"',
    '"admin_keys"',
  ];

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const postgres = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('metachat')
    .withUsername('test')
    .withPassword('test')
    .start();

  const rabbit = await new RabbitMqContainer('rabbitmq:3.12-management')
    .withUser('test', 'test')
    .start();

  const databaseUrl = postgres.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  process.env.RABBITMQ_URL = rabbit.getAmqpUrl();

  await runMigrations(databaseUrl);

  context.postgres = postgres;
  context.rabbit = rabbit;
  context.prisma = new PrismaClient();
});

beforeEach(async () => {
  if (context.prisma) {
    await truncateDatabase(context.prisma);
  }
});

afterAll(async () => {
  if (context.prisma) {
    await context.prisma.$disconnect();
  }
  if (context.postgres) {
    await context.postgres.stop();
  }
  if (context.rabbit) {
    await context.rabbit.stop();
  }
});
