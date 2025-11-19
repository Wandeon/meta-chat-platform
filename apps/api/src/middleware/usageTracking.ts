import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkLimit, getPlan } from '../config/plans';

const prisma = new PrismaClient();

/**
 * Get or create usage tracking record for current period
 */
async function getCurrentUsage(tenantId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Find or create usage tracking for current period
  let usage = await prisma.usageTracking.findFirst({
    where: {
      tenantId,
      periodStart,
    },
  });

  if (!usage) {
    usage = await prisma.usageTracking.create({
      data: {
        tenantId,
        periodStart,
        periodEnd,
        conversationsCount: 0,
        documentsCount: 0,
        teamMembersCount: 0,
        messagesCount: 0,
        apiCallsCount: 0,
      },
    });
  }

  return usage;
}

/**
 * Increment usage counter
 */
async function incrementUsage(
  tenantId: string,
  metric: 'conversations' | 'documents' | 'teamMembers' | 'messages' | 'apiCalls'
) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const fieldMap = {
    conversations: 'conversationsCount',
    documents: 'documentsCount',
    teamMembers: 'teamMembersCount',
    messages: 'messagesCount',
    apiCalls: 'apiCallsCount',
  };

  const field = fieldMap[metric];

  await prisma.usageTracking.updateMany({
    where: {
      tenantId,
      periodStart,
    },
    data: {
      [field]: { increment: 1 },
    },
  });
}

/**
 * Middleware to track API calls and enforce limits
 */
export async function trackApiCall(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      // Skip tracking for non-authenticated requests
      return next();
    }

    // Fetch tenant data to get plan information
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currentPlanId: true },
    });

    const planId = tenant?.currentPlanId || 'free';
    const usage = await getCurrentUsage(tenantId);

    // Check API call limit
    const limitCheck = checkLimit(planId, 'apiCallsPerMonth', usage.apiCallsCount);

    if (!limitCheck.allowed) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'API call limit exceeded for your current plan',
        limit: limitCheck.limit,
        current: usage.apiCallsCount,
        upgrade: 'Please upgrade your plan to continue using the API',
      });
    }

    // Increment API call counter
    await incrementUsage(tenantId, 'apiCalls');

    // Add usage info to response headers
    res.setHeader('X-RateLimit-Limit', limitCheck.limit.toString());
    res.setHeader('X-RateLimit-Remaining', limitCheck.remaining.toString());

    next();
  } catch (error) {
    console.error('Error in usage tracking middleware:', error);
    // Don't block the request if tracking fails
    next();
  }
}

/**
 * Middleware to check conversation limit before creating
 */
export async function checkConversationLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch tenant data to get plan information
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currentPlanId: true },
    });

    const planId = tenant?.currentPlanId || 'free';
    const usage = await getCurrentUsage(tenantId);

    const limitCheck = checkLimit(planId, 'conversations', usage.conversationsCount);

    if (!limitCheck.allowed) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'Conversation limit exceeded for your current plan',
        limit: limitCheck.limit,
        current: usage.conversationsCount,
        upgrade: 'Please upgrade your plan to create more conversations',
      });
    }

    next();
  } catch (error) {
    console.error('Error checking conversation limit:', error);
    next(error);
  }
}

/**
 * Middleware to check document limit before uploading
 */
export async function checkDocumentLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch tenant data to get plan information
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currentPlanId: true },
    });

    const planId = tenant?.currentPlanId || 'free';
    const usage = await getCurrentUsage(tenantId);

    const limitCheck = checkLimit(planId, 'documents', usage.documentsCount);

    if (!limitCheck.allowed) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'Document limit exceeded for your current plan',
        limit: limitCheck.limit,
        current: usage.documentsCount,
        upgrade: 'Please upgrade your plan to upload more documents',
      });
    }

    next();
  } catch (error) {
    console.error('Error checking document limit:', error);
    next(error);
  }
}

/**
 * Middleware to check message limit before sending
 */
export async function checkMessageLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch tenant data to get plan information
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currentPlanId: true },
    });

    const planId = tenant?.currentPlanId || 'free';
    const usage = await getCurrentUsage(tenantId);

    const limitCheck = checkLimit(planId, 'messagesPerMonth', usage.messagesCount);

    if (!limitCheck.allowed) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'Message limit exceeded for your current plan',
        limit: limitCheck.limit,
        current: usage.messagesCount,
        upgrade: 'Please upgrade your plan to send more messages',
      });
    }

    next();
  } catch (error) {
    console.error('Error checking message limit:', error);
    next(error);
  }
}

/**
 * Increment conversation counter after creation
 */
export async function trackConversationCreated(tenantId: string) {
  await incrementUsage(tenantId, 'conversations');
}

/**
 * Increment document counter after upload
 */
export async function trackDocumentUploaded(tenantId: string) {
  await incrementUsage(tenantId, 'documents');
}

/**
 * Increment message counter after sending
 */
export async function trackMessageSent(tenantId: string) {
  await incrementUsage(tenantId, 'messages');
}

/**
 * Get current usage statistics for a tenant
 */
export async function getUsageStats(tenantId: string) {
  const usage = await getCurrentUsage(tenantId);
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { currentPlanId: true },
  });

  const planId = tenant?.currentPlanId || 'free';
  const plan = getPlan(planId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  return {
    usage: {
      conversations: usage.conversationsCount,
      documents: usage.documentsCount,
      teamMembers: usage.teamMembersCount,
      messages: usage.messagesCount,
      apiCalls: usage.apiCallsCount,
    },
    limits: plan.limits,
    periodStart: usage.periodStart,
    periodEnd: usage.periodEnd,
  };
}

export default {
  trackApiCall,
  checkConversationLimit,
  checkDocumentLimit,
  checkMessageLimit,
  trackConversationCreated,
  trackDocumentUploaded,
  trackMessageSent,
  getUsageStats,
};
