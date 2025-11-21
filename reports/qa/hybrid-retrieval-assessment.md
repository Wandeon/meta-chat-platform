# Hybrid retrieval verification

## Findings
- **API vector search is a stub:** `searchSimilarChunks` in the API service builds a basic Prisma filter and returns chunks without using the provided embedding, similarity threshold, or pgvector operators, so keyword-only results are returned. 【F:apps/api/src/services/vectorSearch.ts†L13-L54】
- **Chunk schema and pgvector index:** The `Chunk` model stores embeddings in a `vector(1024)` column with an IVFFlat index, aligning with pgvector usage for cosine similarity queries. 【F:packages/database/prisma/schema.prisma†L145-L162】
- **Database vector search implementation:** The shared database helper normalizes query embeddings, clamps the similarity threshold, and uses pgvector’s `<=>` cosine distance to filter (`<= 1 - minSimilarity`) and order results. 【F:packages/database/src/client.ts†L45-L80】
- **Keyword search implementation:** Full-text search uses PostgreSQL `ts_rank`/`plainto_tsquery` to rank matches for the tenant’s ready documents, enabling keyword-only retrieval when vectors are unavailable. 【F:packages/database/src/client.ts†L82-L109】
- **Embedding generation pipeline:** Document uploads chunk text (default recursive strategy, 512-token window, 64-token overlap), generate embeddings per chunk unless disabled, and insert chunks with `::vector` casting so embedding vectors persist in the `chunks` table. 【F:packages/rag/src/upload-pipeline.ts†L205-L314】【F:packages/rag/src/chunker/index.ts†L7-L182】
- **Embeddings service behavior:** Embeddings are batched, cached, and default to the OpenAI `text-embedding-3-small` model with retry logic and cost tracking, ensuring vectors are created when an API key is configured. 【F:packages/rag/src/embeddings.ts†L47-L188】
- **Hybrid retrieval fusion:** `retrieveKnowledgeBase` always runs keyword search, embeds the query, optionally runs vector search, normalizes both score sets, and fuses them with default weights (30% keyword, 70% vector) while tagging results as `keyword`, `vector`, or `hybrid`. 【F:packages/rag/src/retriever.ts†L53-L137】

## Conclusions
- Embedding creation, storage, and pgvector-backed similarity search exist in the shared database layer and upload pipeline, but the API service still exposes a placeholder vector search that bypasses pgvector.
- Hybrid fusion logic is implemented in the RAG package; end-to-end hybrid retrieval depends on wiring API calls to the database-level keyword and vector search functions.
- Default chunking and embedding settings are sensible for RAG workloads, with overlap to preserve context and normalization/clamping to keep similarity thresholds well-behaved.
