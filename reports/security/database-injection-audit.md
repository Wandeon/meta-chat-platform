# Database Injection Audit

This audit reviews Prisma usage, raw SQL, input validation, and vector search handling to identify SQL/NoSQL injection risks.

## Prisma Query Safety
- **apps/api/services/vectorSearch.ts** uses Prisma's query builder with structured `where` clauses and `take` limits; no string concatenation is present.
- **Prisma service classes/routes** (e.g., auth, documents, chat, analytics) rely on Prisma ORM methods that automatically parameterize values.

## Raw SQL Usage
- **packages/database/src/client.ts**
  - `vectorSearch` and `keywordSearch` use Prisma tagged template `$queryRaw` with interpolated parameters. Embedding vectors are normalized numbers and provided as bound parameters, mitigating injection risk.
- **apps/api/src/services/documentProcessor.ts**
  - Inserts chunk embeddings via `$executeRaw` tagged template; values are parameterized and embeddings are cast server-side.
- **apps/api/src/services/AnalyticsService.ts**
  - Inserts message metrics using `$executeRaw` with bound parameters; no string concatenation.
- **apps/api/src/services/authService.ts**
  - DDL/DML for `pending_tenant_setups` executed through `$executeRaw` tagged templates; parameters are bound.
- **apps/worker/src/jobs/aggregateAnalytics.ts**
  - Aggregation queries and cleanups rely on `$queryRaw`/`$executeRaw` templates with bound parameters.
- **packages/rag/src/upload-pipeline.ts**
  - Uses `$executeRawUnsafe` for dynamic column casting but supplies SQL text with positional parameters and passes values separately. The only string interpolation is the SQL statement itself; parameters are not concatenated.
- **packages/database/src/maintenance.ts**
  - Uses `$executeRawUnsafe` with interpolated partition/index identifiers and date bounds. Identifiers come from internal constants and ISO date strings derived from the current date, but the use of `Unsafe` is a residual risk area; consider switching to `Prisma.sql` helpers and validating inputs when making these dynamic statements.

## Input Validation
- API routes under `apps/api/src/routes/` consistently parse and validate request bodies/queries with Zod schemas and helper utilities before interacting with Prisma.
- Services like `authService` hash passwords and constrain token formats; vector search options do not directly expose raw SQL inputs.

## Vector Search Review
- **apps/api/src/services/vectorSearch.ts** currently performs ORM `findMany` without raw SQL; inputs are structured into a Prisma `where` clause.
- **packages/database/src/client.ts vectorSearch** normalizes numeric embeddings and casts them to `vector`, preventing arbitrary SQL tokens from being injected.

## JSON/JSONB Handling
- JSON metadata is inserted using bound parameters (e.g., `documentProcessor` and `upload-pipeline`), preventing NoSQL-style injection. Prisma defaults to JSONB types and does not evaluate embedded content as SQL.

## Findings
- No evidence of user-controlled string concatenation feeding raw SQL.
- Remaining medium-risk area: `packages/database/src/maintenance.ts` relies on `$executeRawUnsafe` for DDL with interpolated identifiers/dates. Mitigation: wrap dynamic identifiers with `Prisma.sql`/`Prisma.raw` and maintain a whitelist of allowed table/index names to avoid accidental injection if inputs ever become dynamic.

