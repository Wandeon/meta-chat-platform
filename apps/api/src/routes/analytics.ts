import { Router } from 'express';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateTenantUser } from '../middleware/authenticateTenantUser';
import { asyncHandler, respondSuccess } from '../utils/http';
import { AnalyticsService } from '../services/AnalyticsService';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();
const analyticsService = new AnalyticsService(prisma);

// All analytics routes require JWT authentication
router.use(authenticateTenantUser);

/**
 * GET /api/analytics/overview
 * Get comprehensive analytics overview including current metrics and time-series data
 */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;

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
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;
    const { days } = req.query;

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
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;
    const { limit } = req.query;

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
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;
    const { range } = req.query;

    // Parse range (e.g., 7d, 30d, 90d)
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
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;
    const { date } = req.params;

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

export default router;
