# Data Integrity Investigation Queries

This checklist gathers SQL to probe orphaned records, missing foreign keys, invalid states, data-type issues, and uniqueness violations in the production PostgreSQL schema defined in `packages/database/prisma/schema.prisma`.

## 1) Orphaned records

- **Conversations without tenants**
```sql
SELECT c.*
FROM conversations AS c
LEFT JOIN tenants AS t ON t.id = c.tenant_id
WHERE t.id IS NULL;
```

- **Messages without conversations**
```sql
SELECT m.*
FROM messages AS m
LEFT JOIN conversations AS c ON c.id = m.conversation_id
WHERE c.id IS NULL;
```

- **Documents without tenants**
```sql
SELECT d.*
FROM documents AS d
LEFT JOIN tenants AS t ON t.id = d.tenant_id
WHERE t.id IS NULL;
```

## 2) Missing foreign key constraints

Use the catalog to verify that the expected relationships in the Prisma schema actually exist as foreign keys:
```sql
WITH expected AS (
  SELECT * FROM (VALUES
    ('conversations', 'tenant_id', 'tenants', 'id'),
    ('messages', 'tenant_id', 'tenants', 'id'),
    ('messages', 'conversation_id', 'conversations', 'id'),
    ('channels', 'tenant_id', 'tenants', 'id'),
    ('documents', 'tenant_id', 'tenants', 'id'),
    ('chunks', 'tenant_id', 'tenants', 'id'),
    ('chunks', 'document_id', 'documents', 'id')
  ) AS v(src_table, src_column, target_table, target_column)
)
SELECT e.*
FROM expected AS e
LEFT JOIN information_schema.referential_constraints rc
  ON rc.constraint_schema = current_schema()
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = rc.constraint_name
     AND kcu.table_name = e.src_table
     AND kcu.column_name = e.src_column
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = rc.constraint_name
WHERE kcu.constraint_name IS NULL;
```

## 3) Records with invalid states

- **Conversations with unexpected status**
```sql
SELECT id, tenant_id, status
FROM conversations
WHERE status NOT IN ('active', 'assigned_human', 'closed');
```

- **Documents with unexpected status**
```sql
SELECT id, tenant_id, status
FROM documents
WHERE status NOT IN ('pending', 'processing', 'ready', 'failed', 'stale');
```

- **Messages with unexpected direction or type**
```sql
SELECT id, tenant_id, direction, type
FROM messages
WHERE direction NOT IN ('inbound', 'outbound')
   OR type NOT IN ('text', 'image', 'audio', 'video', 'document', 'location');
```

## 4) Data type and value mismatches

- **Document sizes that are negative or zero**
```sql
SELECT id, tenant_id, size
FROM documents
WHERE size <= 0;
```

- **Document versions less than 1**
```sql
SELECT id, tenant_id, version
FROM documents
WHERE version < 1;
```

- **Chunk positions that are null or negative**
```sql
SELECT id, document_id, position
FROM chunks
WHERE position IS NULL OR position < 0;
```

## 5) Unique constraints and duplicates

- **Duplicate channels per tenant/type**
```sql
SELECT tenant_id, type, COUNT(*)
FROM channels
GROUP BY tenant_id, type
HAVING COUNT(*) > 1;
```

- **Duplicate conversations per tenant/channel/external id**
```sql
SELECT tenant_id, channel_type, external_id, COUNT(*)
FROM conversations
GROUP BY tenant_id, channel_type, external_id
HAVING COUNT(*) > 1;
```

- **Messages that reuse the same id at different timestamps**
```sql
SELECT id, COUNT(*)
FROM messages
GROUP BY id
HAVING COUNT(*) > 1;
```

## Requested spot-check queries

- **Find conversations without tenants**
```sql
SELECT c.*
FROM conversations AS c
LEFT JOIN tenants AS t ON t.id = c.tenant_id
WHERE t.id IS NULL;
```

- **Find messages without conversations**
```sql
SELECT m.*
FROM messages AS m
LEFT JOIN conversations AS c ON c.id = m.conversation_id
WHERE c.id IS NULL;
```

- **Find channels with invalid config**
```sql
SELECT c.*,
       CASE c.type
         WHEN 'whatsapp' THEN
           CASE WHEN COALESCE(c.config->>'phoneNumberId', c.config->'whatsapp'->>'phoneNumberId') IS NULL
                  OR COALESCE(c.config->>'accessToken', c.config->'whatsapp'->>'accessToken') IS NULL
                THEN 'missing phoneNumberId or accessToken'
           END
         WHEN 'messenger' THEN
           CASE WHEN COALESCE(c.config->>'pageId', c.config->'messenger'->>'pageId') IS NULL
                  OR COALESCE(c.config->>'pageAccessToken', c.config->'messenger'->>'pageAccessToken') IS NULL
                  OR COALESCE(c.config->>'verifyToken', c.config->'messenger'->>'verifyToken') IS NULL
                  OR COALESCE(c.config->>'appSecret', c.config->'messenger'->>'appSecret') IS NULL
                THEN 'missing pageId, pageAccessToken, verifyToken, or appSecret'
           END
         WHEN 'webchat' THEN
           NULL  -- webchat falls back to defaults, so no required config fields
       END AS config_issue
FROM channels AS c
WHERE (
        c.type = 'whatsapp'
        AND (
          COALESCE(c.config->>'phoneNumberId', c.config->'whatsapp'->>'phoneNumberId') IS NULL
          OR COALESCE(c.config->>'accessToken', c.config->'whatsapp'->>'accessToken') IS NULL
        )
      )
   OR (
        c.type = 'messenger'
        AND (
          COALESCE(c.config->>'pageId', c.config->'messenger'->>'pageId') IS NULL
          OR COALESCE(c.config->>'pageAccessToken', c.config->'messenger'->>'pageAccessToken') IS NULL
          OR COALESCE(c.config->>'verifyToken', c.config->'messenger'->>'verifyToken') IS NULL
          OR COALESCE(c.config->>'appSecret', c.config->'messenger'->>'appSecret') IS NULL
        )
      );
```

- **Find documents without chunks**
```sql
SELECT d.*
FROM documents AS d
LEFT JOIN chunks AS c ON c.document_id = d.id
WHERE c.id IS NULL;
```
