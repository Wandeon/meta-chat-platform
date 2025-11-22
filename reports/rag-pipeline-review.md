# RAG Pipeline Review

## Overview
This review covers the RAG pipeline components in `packages/rag` and the document API route at `apps/api/src/routes/documents.ts`.

## Findings

### Document loaders
- Loaders exist for PDF (`PdfLoader`), DOCX (`DocxLoader`), and text/markdown (`TextLoader`). Each extracts metadata such as title/author (PDF), paragraph counts (DOCX/text), and word counts before returning normalized text. 【F:packages/rag/src/loaders/pdf.ts†L6-L36】【F:packages/rag/src/loaders/docx.ts†L7-L36】【F:packages/rag/src/loaders/text.ts†L7-L31】
- The `LoaderRegistry` throws when no loader matches MIME type or extension, so unsupported types fail fast rather than silently. 【F:packages/rag/src/loaders/registry.ts†L11-L33】

### Chunking strategy
- Chunking supports fixed, semantic (paragraph-based), and recursive (sentence refinement) strategies with defaults of 512 tokens and 64-token overlap. Recursive chunking first groups paragraphs then splits oversized chunks by sentences. 【F:packages/rag/src/chunker/index.ts†L7-L254】
- Empty input returns an empty chunk list, but there are no logs; consider logging when no chunks are produced to help debug ingestion issues.

### Embedding generation
- `EmbeddingsService` batches requests (default 32) and caches embeddings keyed by SHA-256 of text. It uses an OpenAI provider with retries and requires `OPENAI_API_KEY` unless a provider is injected. Costs are tracked per 1K tokens. 【F:packages/rag/src/embeddings.ts†L47-L188】

### Document indexing
- `DocumentUploadPipeline` uses loaders to extract text, chunk it, optionally embed each chunk, and persists chunks with merged loader/chunk metadata and vector data when available. Metadata includes chunking config, source loader metadata, and embedding stats. 【F:packages/rag/src/upload-pipeline.ts†L27-L260】
- However, the API `POST /documents` route never uses this pipeline; it only accepts raw text in `metadata.content`, saves a `.txt` placeholder, and triggers the older `processDocument` service that re-chunks the raw text without file-type loaders. Uploading a PDF via this route would skip PDF parsing, so tests like “Upload a PDF - does it get processed?” will fail. 【F:apps/api/src/routes/documents.ts†L51-L99】

### Retrieval
- Hybrid retrieval fuses keyword and vector results using configurable weights (default 30% keyword / 70% vector). It embeds the query via `EmbeddingsService`, normalizes scores, and merges metadata while flagging missing embeddings with a warning. 【F:packages/rag/src/retriever.ts†L22-L139】

### Metadata preservation
- During indexing, chunk metadata merges loader metadata, chunk positions, and token ranges before persisting to the database. Retrieval also parses stored metadata (JSON or string) and injects the chunk position. 【F:packages/rag/src/upload-pipeline.ts†L222-L259】【F:packages/rag/src/retriever.ts†L100-L139】
- The API route stores user-provided metadata on document creation but does not merge or preserve loader metadata because the loader-based pipeline is not invoked. 【F:apps/api/src/routes/documents.ts†L51-L178】

## Recommendations
1. Connect the API upload flow to `DocumentUploadPipeline` so file uploads (e.g., PDF) use the registered loaders and chunking/embedding metadata. This would satisfy processing and retrieval tests for non-text files.
2. Add logging or telemetry when chunking yields zero chunks to spot ingestion issues early.
3. Consider validating or enriching metadata in the API layer to ensure loader-derived fields are captured when the pipeline runs.

