# RAG System Review

## Executive Summary
- **Hybrid search is not implemented**. The production vector search path only runs a pure cosine-similarity query in PostgreSQL and never merges keyword ranks, so the advertised 70/30 strategy cannot work today. This significantly limits recall on sparse queries and makes the `ragConfig.hybridWeights` setting unused.
- **Document ingestion depends on callers pushing raw text via `metadata.content`**. There is no parser for binary uploads, no file storage, and re-processing simply replays the same metadata. That design blocks the PDF/TXT/MD ingestion scenario described in the product overview.
- **Chunking, embeddings, and context injection are all static** (500-character chunks, fixed 0.5 similarity cutoff, 2,000-character context buffer). None of these parameters are tenant-configurable, so deployments cannot tune for different LLM context windows or domain-specific density.
- **Operational safeguards are missing**: no batching transactions, no progress tracking, no retries/backoff when embedding calls fail, and no analytics around retrieval quality, so troubleshooting bad RAG answers will be difficult.

## Detailed Findings

### Vector & Hybrid Search
1. `searchChunks` issues queries that only sort by `embedding <=> $1::vector` and never perform keyword search or score fusion. There is also no deduplication or normalization step before the results are returned to the chat route, so the 70/30 hybrid design is effectively absent.【F:apps/api/src/services/vectorSearch.ts†L19-L130】
2. The orchestrator exposes a `ragConfig.hybridWeights` property, but `searchChunks` ignores it entirely and the chat route never calls the orchestrator retriever, so tenants cannot override weighting or top-K via config without code changes.【F:apps/api/src/routes/chat.ts†L92-L137】
3. Similarity defaults to 0.5 (not 0.75) and is hardcoded in `DEFAULT_OPTIONS`. Chat simply passes `ragConfig.minSimilarity || 0.5`, so there is no adaptive behavior if queries fail to match and no fallback messaging beyond "continue without RAG" logging.【F:apps/api/src/services/vectorSearch.ts†L26-L105】【F:apps/api/src/routes/chat.ts†L97-L117】
4. The retrieved context string uses a fixed 2,000-character ceiling and concatenates raw chunk bodies without citations beyond a truncated document ID, making it easy to overflow the prompt on smaller LLMs and impossible to point users back to exact sources.【F:apps/api/src/services/vectorSearch.ts†L107-L130】

### Document Processing & Chunking
1. The document API expects admins to send pre-parsed text inside `metadata.content`; the server merely hashes that string and never stores or parses user-uploaded files, so PDF/Docx ingestion, file size checks, and binary sanitization are unsupported.【F:apps/api/src/routes/documents.ts†L51-L100】
2. `processDocument` deletes all existing chunks and reinserts them in a sequential loop without wrapping the delete/insert/update operations in a transaction. Any mid-loop failure will leave the document with zero chunks but status `failed`, requiring manual cleanup.【F:apps/api/src/services/documentProcessor.ts†L21-L146】
3. Embedding generation is limited to `mxbai-embed-large` served via Ollama. There is no retry/backoff besides a fixed 100 ms delay between micro-batches of five, and there is no instrumentation to capture latency or cost (even though OpenAI/Anthropic are not used, GPU cost is still real).【F:apps/api/src/services/documentProcessor.ts†L64-L123】【F:apps/api/src/services/embedding.ts†L5-L67】
4. Chunking uses character counts (500 chars + 50 overlap) rather than token-aware logic, has no semantic boundary detection beyond splitting on spaces, and does not preserve page numbers, section IDs, or code fences in metadata, which hurts grounded answers and debugging.【F:apps/api/src/services/chunking.ts†L18-L224】

### Chat / RAG Integration
1. Context injection simply appends a markdown heading and the concatenated chunk bodies to the tenant-defined system prompt. There is no use of the localized RAG templates or language detection during retrieval, so multilingual support is inconsistent (context is always English unless the source chunk happens to be another language).【F:apps/api/src/routes/chat.ts†L92-L137】【F:apps/api/src/services/ragTemplates.ts†L1-L346】
2. The chat endpoint does not store whether RAG was used in analytics, nor does it return source citations to the caller. That makes it impossible for downstream consumers to know when an answer is grounded.
3. There is no caching or deduplication of retrieval results per conversation, so repeated questions will re-embed and re-query every time.

### Language & Multilingual Support
1. Documents are tagged with a detected language when processed, but `searchChunks` only filters if `languageFilter` is explicitly passed. The chat route never supplies a language filter, so a Spanish query could surface English documents by mistake.【F:apps/api/src/services/documentProcessor.ts†L49-L125】【F:apps/api/src/services/vectorSearch.ts†L19-L78】
2. `ragTemplates` define strong localized prompts, yet no code path applies them, so the investment in multi-language context instructions yields zero effect today.【F:apps/api/src/services/ragTemplates.ts†L1-L346】

### Document Management UI
1. The dashboard page allows text-area uploads and simple metadata editing, but it lacks drag-and-drop UX, upload progress, bulk actions, chunk previews, or re-index controls. It also only accepts lightweight text formats and reads the entire file into memory on the client before posting it, which breaks large PDF workflows.【F:apps/dashboard/src/pages/DocumentsPage.tsx†L1-L226】

### Security & Privacy
1. Because documents are posted as JSON payloads, there is no server-side validation of file type, size, or malware. A malicious admin could inject overly large payloads or script tags that would be stored in metadata and later rendered elsewhere.
2. Vector search queries are built with string interpolation for document filtering. While Prisma’s `$queryRawUnsafe` already accepts parameterized values for the embedding, the optional document filter concatenates raw IDs into the SQL string; a crafted document ID could break the query. Use `prisma.$queryRaw` with placeholders instead.【F:apps/api/src/services/vectorSearch.ts†L50-L86】

### Performance & Scalability
1. Each chunk insert issues an individual `INSERT` statement, which will be slow for large documents. There is no batching or `COPY` usage, and the embeddings are converted to strings on every insert, creating GC pressure.【F:apps/api/src/services/documentProcessor.ts†L83-L110】
2. The Prisma schema hardcodes `vector(1024)` embeddings but the embedding service defers to whatever model is configured; mismatches (e.g., switching to `text-embedding-3-large` with 3072 dims) would fail silently until insert time.【F:packages/database/prisma/schema.prisma†L131-L158】【F:apps/api/src/services/documentProcessor.ts†L112-L182】
3. There are no metrics on search latency, embedding throughput, or chunk counts per tenant beyond ad-hoc logging, so scaling to 100k+ chunks is risky without observability.

## Ratings & Measurements
| Metric | Assessment |
| --- | --- |
| RAG accuracy | Not measured (no evaluation harness or sample documents available in this environment). |
| Performance | **5/10** – synchronous inserts, lack of batching, and missing observability will hurt throughput beyond a few thousand chunks. |
| Search quality | **4/10** – pure vector search with short chunks, no keyword fallback, and no language-aware prompting results in brittle retrieval, especially for sparse queries.

## Recommendations
1. **Implement true hybrid retrieval**: integrate keyword search via `tsvector` or `pg_trgm`, normalize scores to 0–1, and expose tenant-level weights so the advertised 70/30 behavior actually works.
2. **Support real document uploads**: persist binary files, parse PDFs/Docx server-side, and store raw text separately from metadata. Introduce file-size limits, antivirus scans, and asynchronous workers with retry/backoff.
3. **Make chunking & thresholds configurable**: allow per-tenant settings for chunk size, overlap, similarity cutoffs, and context window budgets, plus enforce token-aware truncation before sending to the LLM.
4. **Surface citations & analytics**: store retrieval metadata with each chat response, emit similarity histograms, and return source IDs so users can verify answers.
5. **Add error handling & observability**: wrap document processing in transactions, emit metrics for embedding latency/cost, and alert when a tenant’s documents fail to index.
6. **Leverage multilingual templates**: detect the query language, filter chunks accordingly, and inject the proper `ragTemplates` scaffold so the LLM answers in-language with stronger grounding instructions.

## Security & Scalability Concerns
- Guard SQL queries against injection in `documentFilter` construction.
- Enforce file upload limits and sanitize stored metadata.
- Batch chunk inserts and consider background jobs to keep API latency predictable.

## Missing Features / Critical Bugs
- No re-index button in the UI; editing document content does not automatically re-run embeddings.
- No fallback UX when retrieval fails (chat quietly proceeds without informing the user).
- No cost tracking for embeddings or budget controls per tenant.

## Estimated Effort
- Hybrid retrieval with scoring + citations: **24–32 hours**.
- Robust document ingestion pipeline (file upload, parsing, retries, analytics): **40–60 hours**.
- Multilingual-aware prompting and tenant-configurable thresholds: **20–30 hours**.
- Instrumentation (metrics, analytics, UI status indicators): **20–25 hours**.

