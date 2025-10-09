# Vector Index Maintenance

To keep pgvector indexes performant, schedule regular maintenance for the `chunks` table.

## Recommended Tasks

1. **Rebuild IVFFlat lists**
   ```sql
   REINDEX INDEX CONCURRENTLY "chunks_embedding_ivfflat_idx";
   ```
2. **Refresh planner statistics and pruning**
   ```sql
   VACUUM (ANALYZE) "chunks";
   ```

## Suggested Schedule (cron)

Run the jobs during off-peak hours to avoid contention:

```
0 3 * * 0 psql "$DATABASE_URL" -c 'REINDEX INDEX CONCURRENTLY "chunks_embedding_ivfflat_idx"'
30 3 * * * psql "$DATABASE_URL" -c 'VACUUM (ANALYZE) "chunks"'
```

- Use `CONCURRENTLY` to minimize locking while rebuilding the IVFFlat index.
- Adjust frequency based on ingestion volume. High churn tenants may require daily maintenance.

## Manual Trigger

For manual maintenance, execute:

```bash
pnpm --filter database exec psql -c 'REINDEX INDEX CONCURRENTLY "chunks_embedding_ivfflat_idx"'
pnpm --filter database exec psql -c 'VACUUM (ANALYZE) "chunks"'
```

Ensure the database user running these commands has sufficient privileges to manage indexes.
