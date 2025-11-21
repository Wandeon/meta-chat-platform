# Prisma schema and partitioning integrity review

## Overview
This document captures findings from reviewing `packages/database/prisma/schema.prisma` and the migrations under `packages/database/prisma/migrations/`, with emphasis on relationship integrity, constraints, indexing, defaults, and the new partitioning for `messages`.

## Findings
- **Tenant/message relationship breaks after partitioning**: The partition migration rebuilds `messages` using `LIKE ... INCLUDING` but only re-attaches the `conversationId` foreign key and primary key. The required `tenantId` foreign key and NOT NULL enforcement defined in Prisma are never re-added, allowing `messages.tenantId` to drift from or be absent relative to `tenants`.【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L12-L52】【F:packages/database/prisma/schema.prisma†L58-L98】
- **Partitioned indexes omit tenant filters**: Per-partition indexes cover `conversationId, timestamp`, `externalId`, and `id`, but none include `tenantId`. Tenant-scoped message queries may require partition scans, unlike the Prisma model which indexes `tenantId, conversationId`. Consider adding a partitioned index on `tenantId` (or `tenantId, timestamp`).【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L30-L46】【F:packages/database/prisma/schema.prisma†L89-L98】
- **Cascade behavior diverges**: Conversation-level cascades remain intact, but tenant-level cascades are lost for messages because the tenant foreign key is missing in the partitioned table, permitting orphaned messages on tenant deletion.【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L12-L23】【F:packages/database/prisma/schema.prisma†L58-L98】

## Answers to review questions
- **Orphaned records possible?** Yes; missing `tenantId` foreign key allows messages with invalid or NULL tenants while still linked to conversations.【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L12-L23】
- **Can you create invalid data?** Yes; inserts can specify non-existent tenants or mismatched tenant/conversation pairs without constraint failures after partitioning.【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L12-L23】【F:packages/database/prisma/schema.prisma†L58-L98】
- **Are cascading deletes appropriate?** Conversation cascades remain, but tenant cascades are no longer enforced for messages due to the missing tenant foreign key.【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L12-L23】【F:packages/database/prisma/schema.prisma†L58-L98】
- **Is the partitioning strategy working?** Partitions and indexes are created, but the strategy omits recreating all constraints (notably `tenantId` FK/NOT NULL), undermining integrity and tenant isolation.【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L12-L52】
- **Are there missing indexes causing slow queries?** Yes; lack of a `tenantId` (or `tenantId, timestamp`) partitioned index can slow tenant-scoped message queries despite Prisma expecting such filtering support.【F:packages/database/prisma/migrations/20240520120000_partition_messages_api_logs/migration.sql†L30-L46】【F:packages/database/prisma/schema.prisma†L89-L98】

## Recommended next steps
1. Recreate the `tenantId` foreign key (with NOT NULL) on the partitioned `messages` table and propagate it to partitions to align with Prisma’s required relation and tenant isolation expectations.【F:packages/database/prisma/schema.prisma†L58-L98】
2. Add partitioned indexes that include `tenantId` (e.g., `tenantId, timestamp`) to support tenant-scoped queries and avoid partition scans.【F:packages/database/prisma/schema.prisma†L89-L98】
