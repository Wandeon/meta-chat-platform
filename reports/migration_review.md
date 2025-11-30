# Database Migration Review

## Reversibility
- Most migrations are forward-only and omit explicit rollback steps (e.g., partitioning and RLS enablement), making rollbacks manual and risky. Key examples include partitioning `messages`/`api_logs` and enabling tenant RLS without DOWN scripts.

## Data Preservation
- `20251010000000_update_embedding_dimensions` alters `chunks.embedding` from `vector(1536)` to `vector(1024)` and notes existing embeddings will be cleared, leading to data loss unless re-embedded. No backup step is provided.
- Partitioning migration copies data before renaming tables, but dropping the unpartitioned tables means a rollback would require manual restores.

## Schema Alignment & Order
- Verification token schema is defined twice: `20251119000000_email_verification` creates `verification_tokens` with a nullable `admin_id`, while `20251119104827_add_transactional_signup` expects `admin_id` NOT NULL but only creates the table if missing. Existing databases retain the nullable column, diverging from the Prisma model expectation and risking runtime constraint mismatches.
- Folder timestamps are in ascending order, matching expected execution sequence. Latest migration (`20251120000000_add_channel_metadata`) aligns with `Channel.metadata` in `schema.prisma`.

## Missing Rollbacks / Safety Nets
- No migrations provide DROP/undo steps, so rolling back partitioning, RLS policies, or schema changes would require manual intervention.

## Recommendations
- Add down migrations for index creation, partition setup, and RLS/policy changes so rollbacks are deterministic.
- Provide a migration to backfill/re-embed `chunks.embedding` before altering the vector dimension or to persist old embeddings elsewhere.
- Add a corrective migration to enforce `verification_tokens.admin_id` NOT NULL (with data cleanup) so the database matches the Prisma model and prevents nullable data drift.
- Document operational steps for partition creation to avoid repeated table rewrites if rerun and to handle existing data volumes safely.
