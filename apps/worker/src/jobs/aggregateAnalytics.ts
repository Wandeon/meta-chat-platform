import { PrismaClient } from '@prisma/client';
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('AggregateAnalytics');

/**
 * Daily analytics aggregation job
 * Runs at midnight to aggregate previous day's data into analytics_daily table
 */
export async function aggregateAnalytics(prisma: PrismaClient, targetDate?: Date) {
  const date = targetDate || new Date();
  date.setDate(date.getDate() - 1); // Previous day
  const dateStr = date.toISOString().split('T')[0];

  logger.info(`Starting daily analytics aggregation for ${dateStr}`);

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true },
    });

    logger.info(`Aggregating analytics for ${tenants.length} tenants`);

    for (const tenant of tenants) {
      try {
        await aggregateTenantDay(prisma, tenant.id, dateStr);
        logger.info(`✓ Aggregated analytics for tenant ${tenant.id}`);
      } catch (error) {
        logger.error(`✗ Failed to aggregate tenant ${tenant.id}:`, error as Error);
        // Continue with other tenants
      }
    }

    // Clean up old message_metrics (older than 90 days)
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 90);

    const deleted = await prisma.$executeRaw`
      DELETE FROM message_metrics
      WHERE created_at < ${cleanupDate}
    `;

    logger.info(`Cleaned up ${deleted} old message_metrics records`);
    logger.info('Daily analytics aggregation completed successfully');
  } catch (error) {
    logger.error('Daily analytics aggregation failed:', error as Error);
    throw error;
  }
}

/**
 * Aggregate analytics for a specific tenant and date
 */
async function aggregateTenantDay(
  prisma: PrismaClient,
  tenantId: string,
  dateStr: string
): Promise<void> {
  const startOfDay = new Date(dateStr);
  const endOfDay = new Date(dateStr);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Calculate usage metrics
  const conversationStats = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM conversations
    WHERE tenant_id = ${tenantId}
    AND DATE(created_at) = ${dateStr}::date
  `;

  const messageStats = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM messages
    WHERE tenant_id = ${tenantId}
    AND DATE(created_at) = ${dateStr}::date
  `;

  const activeUserStats = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT user_id) as count
    FROM conversations
    WHERE tenant_id = ${tenantId}
    AND DATE(created_at) = ${dateStr}::date
  `;

  // RAG metrics from message_metrics
  const ragStats = await prisma.$queryRaw<Array<{
    rag_queries: bigint;
    avg_similarity: number | null;
  }>>`
    SELECT
      COUNT(*) FILTER (WHERE rag_used = true) as rag_queries,
      AVG(rag_similarity) FILTER (WHERE rag_used = true) as avg_similarity
    FROM message_metrics
    WHERE tenant_id = ${tenantId}
    AND DATE(created_at) = ${dateStr}::date
  `;

  // Performance metrics
  const performanceStats = await prisma.$queryRaw<Array<{
    avg_response_time: number | null;
    error_count: bigint;
  }>>`
    SELECT
      AVG(response_time_ms)::integer as avg_response_time,
      COUNT(*) FILTER (WHERE error_occurred = true) as error_count
    FROM message_metrics
    WHERE tenant_id = ${tenantId}
    AND DATE(created_at) = ${dateStr}::date
  `;

  // Escalation metrics
  const escalationStats = await prisma.$queryRaw<Array<{
    escalated: bigint;
  }>>`
    SELECT COUNT(*) as escalated
    FROM message_metrics
    WHERE tenant_id = ${tenantId}
    AND escalated = true
    AND DATE(created_at) = ${dateStr}::date
  `;

  // Document queries (count distinct documents queried via RAG)
  const docStats = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT rag_top_document_id) as count
    FROM message_metrics
    WHERE tenant_id = ${tenantId}
    AND rag_used = true
    AND rag_top_document_id IS NOT NULL
    AND DATE(created_at) = ${dateStr}::date
  `;

  // Widget analytics
  const widgetStats = await prisma.$queryRaw<Array<{
    impressions: bigint;
    conversations: bigint;
  }>>`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'message_sent') as conversations
    FROM widget_analytics
    WHERE tenant_id = ${tenantId}
    AND DATE(created_at) = ${dateStr}::date
  `;

  const totalConversations = Number(conversationStats[0]?.count || 0);
  const totalMessages = Number(messageStats[0]?.count || 0);
  const activeUsers = Number(activeUserStats[0]?.count || 0);
  const ragQueries = Number(ragStats[0]?.rag_queries || 0);
  const ragAvgSimilarity = ragStats[0]?.avg_similarity;
  const avgResponseTimeMs = performanceStats[0]?.avg_response_time;
  const errorCount = Number(performanceStats[0]?.error_count || 0);
  const conversationsEscalated = Number(escalationStats[0]?.escalated || 0);
  const documentsQueried = Number(docStats[0]?.count || 0);
  const widgetImpressions = Number(widgetStats[0]?.impressions || 0);
  const widgetConversations = Number(widgetStats[0]?.conversations || 0);

  // Resolved conversations are those that ended without escalation
  const conversationsResolved = totalConversations - conversationsEscalated;

  // Upsert into analytics_daily
  await prisma.$executeRaw`
    INSERT INTO analytics_daily (
      tenant_id,
      date,
      total_conversations,
      total_messages,
      active_users,
      documents_queried,
      api_calls,
      avg_response_time_ms,
      rag_queries,
      rag_avg_similarity,
      conversations_resolved,
      conversations_escalated,
      error_count,
      widget_impressions,
      widget_conversations,
      updated_at
    ) VALUES (
      ${tenantId},
      ${dateStr}::date,
      ${totalConversations},
      ${totalMessages},
      ${activeUsers},
      ${documentsQueried},
      0,
      ${avgResponseTimeMs},
      ${ragQueries},
      ${ragAvgSimilarity},
      ${conversationsResolved},
      ${conversationsEscalated},
      ${errorCount},
      ${widgetImpressions},
      ${widgetConversations},
      NOW()
    )
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET
      total_conversations = EXCLUDED.total_conversations,
      total_messages = EXCLUDED.total_messages,
      active_users = EXCLUDED.active_users,
      documents_queried = EXCLUDED.documents_queried,
      avg_response_time_ms = EXCLUDED.avg_response_time_ms,
      rag_queries = EXCLUDED.rag_queries,
      rag_avg_similarity = EXCLUDED.rag_avg_similarity,
      conversations_resolved = EXCLUDED.conversations_resolved,
      conversations_escalated = EXCLUDED.conversations_escalated,
      error_count = EXCLUDED.error_count,
      widget_impressions = EXCLUDED.widget_impressions,
      widget_conversations = EXCLUDED.widget_conversations,
      updated_at = NOW()
  `;
}

/**
 * Standalone execution
 */
if (require.main === module) {
  const { getPrismaClient } = require('@meta-chat/database');
  const prisma = getPrismaClient();

  aggregateAnalytics(prisma)
    .then(() => {
      logger.info('Analytics aggregation completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Analytics aggregation failed:', error);
      process.exit(1);
    });
}
