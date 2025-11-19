# Database Schema & Migration Review

**Repository**: meta-chat-platform  
**Commit**: 3e7fa8e  
**Scope**: `packages/database/prisma/schema.prisma` and migrations `20251119000000`‑`20251119000300`

## Summary
- **Schema design rating**: **6 / 10** — multi-tenant relations are consistent, but enums, unique slugs, and Prisma model coverage are lacking.
- **Key risks**: Schema drift (missing Prisma models), loose status fields, nullable billing identifiers without constraints, analytics tables with no foreign keys, and unbounded telemetry retention.
- **Opportunities**: Enforce enums/CHECKs, add tenant slugs, convert timestamps to `TIMESTAMPTZ`, add pgvector/FTS indexes, and partition telemetry tables.

## Detailed Findings
### 1. Schema Design
- `Tenant` lacks a `slug` + unique constraint, so subdomains cannot be enforced and lookups require `id` or `name` matches.
- Newly migrated columns (`email_verified`, `widget_config`, billing fields) exist in SQL but not in Prisma models, causing schema drift and preventing application-level enforcement.
- Conversation and document statuses are plain strings; invalid values can be inserted. Replace with Prisma enums (or DB enums/CHECK constraints) for `Conversation.status`, `Document.status`, `Document.type`, `Invoice.status`, etc.
- `Message` uses a composite primary key (`@@id([id, timestamp])`), complicating single-row updates/deletes; replace with a single UUID primary key.
- JSON blobs (`Tenant.settings`, `Tenant.widgetConfig`) provide flexibility but hamper querying; consider extracting frequently queried settings into columns.

### 2. Migrations & Constraints
- Recent migrations add `verification_tokens`, `widget_config`, Stripe billing columns, analytics tables, and message metrics, but Prisma has no corresponding models—`prisma migrate diff` will always show drift, and Prisma Client cannot operate on these tables.
- Migration SQL uses `TIMESTAMP` instead of `TIMESTAMPTZ`, losing timezone information for billing windows and analytics. Convert affected columns to `TIMESTAMPTZ` and update Prisma schema accordingly.
- `analytics_daily` and `message_metrics` tables lack foreign keys to `tenants` (and `conversations`/`messages`), so orphaned rows and cross-tenant data leakage are possible. Add `ON DELETE CASCADE` foreign keys plus supporting indexes.
- `message_metrics.user_message` stores raw user text indefinitely. Define retention (e.g., 90 days) or anonymization to satisfy GDPR.

### 3. Indexing & Performance
- `Tenant` only indexes billing columns; add indexes for future `slug` lookups and active tenants.
- `Invoice` lacks `(tenant_id, status)` or `(tenant_id, period_start)` indexes, hindering billing dashboards.
- `Chunk.embedding` requires a vector index (HNSW or IVFFlat) plus a fallback full-text search index on `content` for hybrid retrieval. Ensure migrations create the necessary indexes.
- Telemetry tables (`message_metrics`, `widget_analytics`, `api_logs`) will grow rapidly. Partition by month and enforce automated pruning to keep query performance within SLA.

### 4. Data Integrity & GDPR
- Ensure all `tenantId` relationships have cascading foreign keys so tenant deletion cleans up conversations, documents, chunks, invoices, analytics rows, etc.
- Introduce `deletedAt` soft-delete columns on PII-heavy tables or guarantee hard deletes on request.
- Document retention/anonymization for user messages, admin audit logs, and API logs to maintain GDPR compliance.

## Recommendations
1. **Add tenant slug + unique constraint** and backfill for existing tenants to enable deterministic subdomains.
2. **Introduce enums/CHECK constraints** for conversation/document statuses, document types, invoice status/currency, and subscription status.
3. **Model new tables/columns in Prisma** (verification tokens, widget config, Stripe billing, analytics) to eliminate drift and enable type-safe access.
4. **Convert timestamps to `TIMESTAMPTZ`** and align Prisma schema, preventing DST/timezone bugs.
5. **Add foreign keys + indexes** for analytics/telemetry tables and ensure cascading deletes.
6. **Implement pgvector HNSW and GIN FTS indexes** for chunk retrieval performance.
7. **Partition and retain telemetry data** (message metrics, widget analytics, API logs) with rolling 90-day retention to control storage and meet compliance needs.

## Estimated Effort
| Task | Est. hours |
| --- | --- |
| Tenant slug + indexes | 2–3 |
| Enums/CHECK constraints | 4–5 |
| TIMESTAMPTZ conversion | 3–4 |
| FK + cleanup for analytics tables | 3 |
| Vector/FTS indexes + telemetry partitioning | 4–6 |
| GDPR retention playbooks | 2 |
| **Total** | **18–23** |

## Suggested SQL Snippets
```sql
ALTER TABLE tenants ADD COLUMN slug TEXT;
UPDATE tenants SET slug = lower(replace(name, ' ', '-')) WHERE slug IS NULL;
ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX tenants_slug_key ON tenants(slug);

ALTER TABLE conversations
  ADD CONSTRAINT conversations_status_chk
    CHECK (status IN ('active','archived','deleted'));

ALTER TABLE message_metrics
  ADD CONSTRAINT message_metrics_conversation_fk
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id) ON DELETE CASCADE,
  ADD CONSTRAINT message_metrics_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```
