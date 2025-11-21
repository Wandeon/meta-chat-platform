// Re-export Prisma client
export { PrismaClient, Prisma } from '@prisma/client';
export type { 
  Tenant, Channel, Conversation, Message, Document, Chunk,
  AdminUser, AdminApiKey, VerificationToken,
  TenantApiKey, Invoice, UsageTracking,
  AnalyticsDaily, MessageMetrics, WidgetAnalytics,
  McpServer, Webhook, Event, TenantSecret, ChannelSecret,
  ApiLog, AdminAuditLog
} from '@prisma/client';

// Export service modules
export * from './admin';
export * from './client';
export * from './maintenance';
export * from './search-validation';
export * from './partitioning';

// Export enums
export { 
  AdminRole, AdminKeyStatus
} from '@prisma/client';
