import { Router } from 'express';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdmin } from '../middleware/auth';
import { asyncHandler, respondSuccess } from '../utils/http';
import { AnalyticsService } from '../services/AnalyticsService';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();
const analyticsService = new AnalyticsService(prisma);

// All analytics routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/analytics/overview
 * Get comprehensive analytics overview including current metrics and time-series data
 */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    // Get current snapshot metrics
    const current = await analyticsService.getCurrentMetrics(tenantId);

    // Get time-series data for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const [conversationStats, messageStats] = await Promise.all([
      analyticsService.getConversationStats(tenantId, startDate, endDate),
      analyticsService.getMessageStats(tenantId, startDate, endDate),
    ]);

    respondSuccess(res, {
      current,
      period: {
        conversations: conversationStats,
        messages: messageStats,
      },
    });
  })
);

/**
 * GET /api/analytics/rag-performance
 * Get RAG (Retrieval-Augmented Generation) performance metrics
 */
router.get(
  '/rag-performance',
  asyncHandler(async (req, res) => {
    const { tenantId, days } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    // Default to last 30 days
    const numDays = days ? parseInt(days as string) : 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);

    const ragMetrics = await analyticsService.getRAGPerformance(tenantId, startDate, endDate);

    respondSuccess(res, ragMetrics);
  })
);

/**
 * GET /api/analytics/top-questions
 * Get most frequently asked questions
 */
router.get(
  '/top-questions',
  asyncHandler(async (req, res) => {
    const { tenantId, limit } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    const limitNum = limit ? parseInt(limit as string) : 10;
    const topQuestions = await analyticsService.getTopQuestions(tenantId, limitNum);

    respondSuccess(res, topQuestions);
  })
);

/**
 * GET /api/analytics/response-times
 * Get response time statistics with percentiles
 */
router.get(
  '/response-times',
  asyncHandler(async (req, res) => {
    const { tenantId, range } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    // Parse range (e.g., "7d", "30d", "90d")
    let days = 7;
    if (range && typeof range === 'string') {
      const match = range.match(/^(\d+)d$/);
      if (match) {
        days = parseInt(match[1]);
      }
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const responseTimeStats = await analyticsService.getResponseTimes(tenantId, startDate, endDate);

    respondSuccess(res, responseTimeStats);
  })
);

/**
 * GET /api/analytics/daily/:date
 * Get daily aggregate metrics for a specific date
 */
router.get(
  '/daily/:date',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.query;
    const { date } = req.params;

    if (!tenantId || typeof tenantId !== 'string') {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    // Parse and validate date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const dailyStats = await analyticsService.getDailyAggregate(tenantId, targetDate);

    if (!dailyStats) {
      return res.status(404).json({ error: 'No data found for the specified date' });
    }

    respondSuccess(res, dailyStats);
  })
);

/**
 * GET /api/analytics/health
 * Get analytics job health status
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    // Check if analytics_daily table has recent data
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const dateStr = oneDayAgo.toISOString().split('T')[0];

    const recentAggregates = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM analytics_daily
      WHERE date >= ${dateStr}::date
    `;

    const hasRecentData = Number(recentAggregates[0]?.count || 0) > 0;

    // Get latest analytics entry timestamp
    const latestEntry = await prisma.$queryRaw<Array<{ updated_at: Date; date: Date }>>`
      SELECT date, updated_at
      FROM analytics_daily
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const health = {
      status: hasRecentData ? 'healthy' : 'warning',
      message: hasRecentData
        ? 'Analytics job running normally'
        : 'No recent analytics data found',
      cronSchedule: '0 2 * * *',
      nextScheduledRun: 'Daily at 2:00 AM UTC',
      lastProcessedDate: latestEntry[0]?.date || null,
      lastUpdatedAt: latestEntry[0]?.updated_at || null,
      hasRecentData,
    };

    respondSuccess(res, health);
  })
);

/**
 * POST /api/analytics/trigger
 * Manually trigger analytics aggregation job
 */
router.post(
  '/trigger',
  asyncHandler(async (req, res) => {
    const { date } = req.body;

    // Validate optional date parameter
    let targetDate: Date | undefined;
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
    }

    try {
      const startTime = Date.now();

      // Run analytics aggregation inline
      await runAnalyticsAggregation(prisma, targetDate);

      const duration = Date.now() - startTime;

      respondSuccess(res, {
        message: 'Analytics aggregation completed successfully',
        duration: `${duration}ms`,
        processedDate: targetDate
          ? targetDate.toISOString().split('T')[0]
          : new Date(Date.now() - 86400000).toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Analytics aggregation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * Helper function to run analytics aggregation
 * This is a simplified version that triggers the aggregation
 */
async function runAnalyticsAggregation(prisma: any, targetDate?: Date) {
  const date = targetDate || new Date();
  date.setDate(date.getDate() - 1); // Previous day
  const dateStr = date.toISOString().split('T')[0];

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true },
  });

  for (const tenant of tenants) {
    await aggregateTenantDay(prisma, tenant.id, dateStr);
  }
}

/**
 * Aggregate analytics for a specific tenant and date
 */
async function aggregateTenantDay(
  prisma: any,
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

  // Document queries
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

export default router;
