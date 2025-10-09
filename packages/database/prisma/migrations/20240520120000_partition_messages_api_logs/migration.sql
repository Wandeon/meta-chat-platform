-- Migrate messages and api_logs tables to use monthly range partitioning

DO $$
DECLARE
  start_month date;
  end_month date;
  current_month date;
  next_month date;
  partition_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_partitioned_table WHERE partrelid = 'messages'::regclass) THEN
    EXECUTE 'CREATE TABLE messages_partitioned (LIKE messages INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY) PARTITION BY RANGE ("timestamp")';
    EXECUTE 'ALTER TABLE messages_partitioned ADD CONSTRAINT messages_partitioned_conversation_fkey FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE';
    EXECUTE 'ALTER TABLE messages_partitioned ADD CONSTRAINT messages_partitioned_pkey PRIMARY KEY ("id", "timestamp")';

    start_month := date_trunc('month', now()) - INTERVAL '12 months';
    end_month := date_trunc('month', now()) + INTERVAL '12 months';
    current_month := start_month;

    WHILE current_month <= end_month LOOP
      next_month := (current_month + INTERVAL '1 month')::date;
      partition_name := format('messages_%s', to_char(current_month, 'YYYY_MM'));

      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages_partitioned FOR VALUES FROM (%L) TO (%L);',
        partition_name,
        current_month,
        next_month
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_conversation_timestamp_idx ON %I ("conversationId", "timestamp");',
        partition_name,
        partition_name
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_external_id_idx ON %I ("externalId");',
        partition_name,
        partition_name
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_id_idx ON %I ("id");',
        partition_name,
        partition_name
      );

      current_month := next_month;
    END LOOP;

    EXECUTE 'INSERT INTO messages_partitioned SELECT * FROM messages';
    EXECUTE 'ALTER TABLE messages RENAME TO messages_unpartitioned';
    EXECUTE 'ALTER TABLE messages_partitioned RENAME TO messages';
    EXECUTE 'CREATE INDEX IF NOT EXISTS messages_conversation_timestamp_idx ON messages ("conversationId", "timestamp")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS messages_external_id_idx ON messages ("externalId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS messages_id_idx ON messages ("id")';
    EXECUTE 'DROP TABLE IF EXISTS messages_unpartitioned';
  END IF;
END $$;

DO $$
DECLARE
  start_month date;
  end_month date;
  current_month date;
  next_month date;
  partition_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_partitioned_table WHERE partrelid = 'api_logs'::regclass) THEN
    EXECUTE 'CREATE TABLE api_logs_partitioned (LIKE api_logs INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY) PARTITION BY RANGE ("timestamp")';
    EXECUTE 'ALTER TABLE api_logs_partitioned ADD CONSTRAINT api_logs_partitioned_pkey PRIMARY KEY ("id", "timestamp")';

    start_month := date_trunc('month', now()) - INTERVAL '12 months';
    end_month := date_trunc('month', now()) + INTERVAL '12 months';
    current_month := start_month;

    WHILE current_month <= end_month LOOP
      next_month := (current_month + INTERVAL '1 month')::date;
      partition_name := format('api_logs_%s', to_char(current_month, 'YYYY_MM'));

      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF api_logs_partitioned FOR VALUES FROM (%L) TO (%L);',
        partition_name,
        current_month,
        next_month
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_timestamp_idx ON %I ("timestamp");',
        partition_name,
        partition_name
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_tenant_timestamp_idx ON %I ("tenantId", "timestamp");',
        partition_name,
        partition_name
      );

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_id_idx ON %I ("id");',
        partition_name,
        partition_name
      );

      current_month := next_month;
    END LOOP;

    EXECUTE 'INSERT INTO api_logs_partitioned SELECT * FROM api_logs';
    EXECUTE 'ALTER TABLE api_logs RENAME TO api_logs_unpartitioned';
    EXECUTE 'ALTER TABLE api_logs_partitioned RENAME TO api_logs';
    EXECUTE 'CREATE INDEX IF NOT EXISTS api_logs_timestamp_idx ON api_logs ("timestamp")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS api_logs_tenant_timestamp_idx ON api_logs ("tenantId", "timestamp")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS api_logs_id_idx ON api_logs ("id")';
    EXECUTE 'DROP TABLE IF EXISTS api_logs_unpartitioned';
  END IF;
END $$;
