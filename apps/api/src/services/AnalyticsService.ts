import { PrismaClient } from '@prisma/client';

export interface TimeSeriesDataPoint {
  date: string;
  count: number;
  value?: number;
}

export interface CurrentMetrics {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  avgResponseTime: string;
}

export interface RAGMetrics {
  totalQueries: number;
  avgSimilarity: number;
  hitRate: number;
  topDocuments: Array<{
    documentId: string;
    queries: number;
    avgSimilarity: number;
  }>;
}

export interface TopQuestion {
  question: string;
  count: number;
  avgSimilarity?: number;
}

export interface ResponseTimeStats {
  avg: string;
  p50: string;
  p95: string;
  p99: string;
  byDay: Array<{
    date: string;
    avg: number;
    p95: number;
  }>;
}

export interface DailyStats {
  date: string;
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  avgResponseTime: number | null;
  ragQueries: number;
  ragAvgSimilarity: number | null;
  conversationsResolved: number;
  conversationsEscalated: number;
  errorCount: number;
}

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get current snapshot metrics for a tenant
   */
  async getCurrentMetrics(tenantId: string): Promise<CurrentMetrics> {
    try {
      // Get total conversations
      const totalConversations = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM conversations
        WHERE "tenantId" = ${tenantId}
      `;

      // Get total messages
      const totalMessages = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM messages
        WHERE "tenantId" = ${tenantId}
      `;

      // Get active users (unique user_ids in last 30 days)
      const activeUsers = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "userId") as count
        FROM conversations
        WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      `;

      // Get average response time from recent message_metrics
      const avgResponseTime = await this.prisma.$queryRaw<Array<{ avg: number | null }>>`
        SELECT AVG(response_time_ms) as avg
        FROM message_metrics
        WHERE tenant_id = ${tenantId}
        AND response_time_ms IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      `;

      const avgMs = avgResponseTime[0]?.avg || 0;
      const avgSeconds = avgMs ? (avgMs / 1000).toFixed(1) : '0';

      return {
        totalConversations: Number(totalConversations[0]?.count || 0),
        totalMessages: Number(totalMessages[0]?.count || 0),
        activeUsers: Number(activeUsers[0]?.count || 0),
        avgResponseTime: `${avgSeconds}s`,
      };
    } catch (error) {
      console.error('Error getting current metrics:', error);
      throw new Error(`Failed to get current metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation statistics over a date range
   */
  async getConversationStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesDataPoint[]> {
    try {
      const stats = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM conversations
        WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      return stats.map(s => ({
        date: s.date.toISOString().split('T')[0],
        count: Number(s.count),
      }));
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      throw new Error(`Failed to get conversation stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get message statistics over a date range
   */
  async getMessageStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesDataPoint[]> {
    try {
      const stats = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM messages
        WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      return stats.map(s => ({
        date: s.date.toISOString().split('T')[0],
        count: Number(s.count),
      }));
    } catch (error) {
      console.error('Error getting message stats:', error);
      throw new Error(`Failed to get message stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get RAG performance metrics
   */
  async getRAGPerformance(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RAGMetrics> {
    try {
      // Get total queries and average similarity
      const summary = await this.prisma.$queryRaw<Array<{
        total_queries: bigint;
        avg_similarity: number | null;
      }>>`
        SELECT
          COUNT(*) as total_queries,
          AVG(rag_similarity) as avg_similarity
        FROM message_metrics
        WHERE tenant_id = ${tenantId}
        AND rag_used = true
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      `;

      // Calculate hit rate (queries with similarity > 0.7)
      const hits = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM message_metrics
        WHERE tenant_id = ${tenantId}
        AND rag_used = true
        AND rag_similarity >= 0.7
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      `;

      // Get top documents by query count
      const topDocs = await this.prisma.$queryRaw<Array<{
        document_id: string;
        queries: bigint;
        avg_similarity: number;
      }>>`
        SELECT
          rag_top_document_id as document_id,
          COUNT(*) as queries,
          AVG(rag_similarity) as avg_similarity
        FROM message_metrics
        WHERE tenant_id = ${tenantId}
        AND rag_used = true
        AND rag_top_document_id IS NOT NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        GROUP BY rag_top_document_id
        ORDER BY queries DESC
        LIMIT 10
      `;

      const totalQueries = Number(summary[0]?.total_queries || 0);
      const hitRate = totalQueries > 0 ? Number(hits[0]?.count || 0) / totalQueries : 0;

      return {
        totalQueries,
        avgSimilarity: summary[0]?.avg_similarity || 0,
        hitRate,
        topDocuments: topDocs.map(d => ({
          documentId: d.document_id,
          queries: Number(d.queries),
          avgSimilarity: d.avg_similarity,
        })),
      };
    } catch (error) {
      console.error('Error getting RAG performance:', error);
      throw new Error(`Failed to get RAG performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get daily aggregate for a specific date
   */
  async getDailyAggregate(tenantId: string, date: Date): Promise<DailyStats | null> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      const result = await this.prisma.$queryRaw<Array<any>>`
        SELECT *
        FROM analytics_daily
        WHERE tenant_id = ${tenantId}
        AND date = ${dateStr}::date
      `;

      if (!result || result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        date: dateStr,
        totalConversations: row.total_conversations,
        totalMessages: row.total_messages,
        activeUsers: row.active_users,
        avgResponseTime: row.avg_response_time_ms,
        ragQueries: row.rag_queries,
        ragAvgSimilarity: row.rag_avg_similarity ? parseFloat(row.rag_avg_similarity) : null,
        conversationsResolved: row.conversations_resolved,
        conversationsEscalated: row.conversations_escalated,
        errorCount: row.error_count,
      };
    } catch (error) {
      console.error('Error getting daily aggregate:', error);
      throw new Error(`Failed to get daily aggregate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top questions asked
   */
  async getTopQuestions(tenantId: string, limit: number = 10): Promise<TopQuestion[]> {
    try {
      const questions = await this.prisma.$queryRaw<Array<{
        user_message: string;
        count: bigint;
        avg_similarity: number | null;
      }>>`
        SELECT
          user_message,
          COUNT(*) as count,
          AVG(rag_similarity) as avg_similarity
        FROM message_metrics
        WHERE tenant_id = ${tenantId}
        AND user_message IS NOT NULL
        AND user_message != ''
        AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY user_message
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      return questions.map(q => ({
        question: q.user_message,
        count: Number(q.count),
        avgSimilarity: q.avg_similarity || undefined,
      }));
    } catch (error) {
      console.error('Error getting top questions:', error);
      throw new Error(`Failed to get top questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get response time statistics
   */
  async getResponseTimes(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResponseTimeStats> {
    try {
      // Get overall percentiles
      const percentiles = await this.prisma.$queryRaw<Array<{
        avg: number;
        p50: number;
        p95: number;
        p99: number;
      }>>`
        SELECT
          AVG(response_time_ms) as avg,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time_ms) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99
        FROM message_metrics
        WHERE tenant_id = ${tenantId}
        AND response_time_ms IS NOT NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      `;

      // Get by-day stats
      const byDay = await this.prisma.$queryRaw<Array<{
        date: Date;
        avg: number;
        p95: number;
      }>>`
        SELECT
          DATE("createdAt") as date,
          AVG(response_time_ms) as avg,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95
        FROM message_metrics
        WHERE tenant_id = ${tenantId}
        AND response_time_ms IS NOT NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const stats = percentiles[0] || { avg: 0, p50: 0, p95: 0, p99: 0 };

      return {
        avg: `${(stats.avg / 1000).toFixed(1)}s`,
        p50: `${(stats.p50 / 1000).toFixed(1)}s`,
        p95: `${(stats.p95 / 1000).toFixed(1)}s`,
        p99: `${(stats.p99 / 1000).toFixed(1)}s`,
        byDay: byDay.map(d => ({
          date: d.date.toISOString().split('T')[0],
          avg: Math.round(d.avg),
          p95: Math.round(d.p95),
        })),
      };
    } catch (error) {
      console.error('Error getting response times:', error);
      throw new Error(`Failed to get response times: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track a message metric (called from chat route)
   */
  async trackMessageMetric(data: {
    conversationId: string;
    messageId: string;
    tenantId: string;
    sentAt: Date;
    responseAt: Date;
    ragUsed: boolean;
    ragSimilarity?: number;
    ragChunksRetrieved?: number;
    ragTopDocumentId?: string;
    confidenceScore?: number;
    escalated: boolean;
    errorOccurred?: boolean;
    userMessage?: string;
  }): Promise<void> {
    try {
      const responseTimeMs = data.responseAt.getTime() - data.sentAt.getTime();

      await this.prisma.$executeRaw`
        INSERT INTO message_metrics (
          conversation_id,
          message_id,
          tenant_id,
          sent_at,
          response_at,
          response_time_ms,
          rag_used,
          rag_similarity,
          rag_chunks_retrieved,
          rag_top_document_id,
          confidence_score,
          escalated,
          error_occurred,
          user_message
        ) VALUES (
          ${data.conversationId},
          ${data.messageId},
          ${data.tenantId},
          ${data.sentAt},
          ${data.responseAt},
          ${responseTimeMs},
          ${data.ragUsed},
          ${data.ragSimilarity || null},
          ${data.ragChunksRetrieved || null},
          ${data.ragTopDocumentId || null},
          ${data.confidenceScore || null},
          ${data.escalated},
          ${data.errorOccurred || false},
          ${data.userMessage || null}
        )
      `;
    } catch (error) {
      console.error('Error tracking message metric:', error);
      // Don't throw - we don't want analytics failures to break the chat flow
    }
  }
}
