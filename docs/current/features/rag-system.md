# RAG System

**Last Updated:** 2025-11-18
**Status:** ✅ Current (Major improvements deployed today)
**Maintainer:** AI/ML Team

## Overview

The RAG (Retrieval-Augmented Generation) system enables the Meta Chat Platform to provide accurate, context-aware responses by retrieving relevant information from a knowledge base of uploaded documents. The system uses vector embeddings and semantic similarity search to find the most relevant document chunks for each user query, then injects this context into the LLM prompt.

**Key Capabilities:**
- Semantic search over document knowledge bases using pgvector
- Multi-language support for 13 languages with localized prompt templates
- Quality-based context injection with similarity thresholds
- Automatic language detection for documents and conversations
- Scalable chunking and embedding pipeline
- Support for multiple embedding providers (Ollama, OpenAI)

## Architecture

### Components

The RAG system consists of several interconnected services:

```
User Query → Vector Search → Similarity Scoring → Template Selection → LLM with Context
                ↑                                         ↓
            Document Processing ← Chunking ← Embedding Generation
```

#### 1. Document Processing Pipeline

**File:** `apps/api/src/services/documentProcessor.ts`

When documents are uploaded, they go through this pipeline:

1. **Upload & Storage**: Document saved with metadata, status set to `pending`
2. **Language Detection**: Automatic detection using franc library (ISO 639-1 codes)
3. **Chunking**: Text split into ~500-character chunks with 50-character overlap
4. **Embedding Generation**: Each chunk converted to 1024-dimensional vector using `mxbai-embed-large`
5. **Database Storage**: Chunks and embeddings stored in PostgreSQL with pgvector
6. **Status Update**: Document status updated to `indexed`

**Supported Status Values:**
- `pending` - Uploaded, awaiting processing
- `processing` - Currently being chunked and embedded
- `indexed` - Ready for RAG search
- `failed` - Processing error occurred
- `stale` - Document has been re-uploaded

#### 2. Vector Search Engine

**File:** `apps/api/src/services/vectorSearch.ts`

Uses PostgreSQL's pgvector extension for semantic similarity search:

- **Similarity Metric**: Cosine distance (pgvector operator)
- **Score Normalization**: Converts distance (0-2) to similarity (0-1): similarity = 1 - (distance / 2)
- **Filtering**: Supports language filtering and document ID restrictions
- **Context Building**: Aggregates top results with metadata into formatted context string

**Search Parameters:**
```typescript
{
  limit: 5,                    // Number of chunks to retrieve
  minSimilarity: 0.5,          // Minimum similarity threshold (0-1)
  documentIds?: string[],      // Optional document filtering
  languageFilter?: string      // Optional language filtering (ISO 639-1)
}
```

#### 3. RAG Templates System (NEW - 2025-11-18)

**File:** `apps/api/src/services/ragTemplates.ts`

Language-specific prompt templates ensure LLMs respond in the user's language and actually use the retrieved context. This system was added to solve two critical issues:

**Problem Solved:**
1. Weak prompts like "you can use this context" allowed smaller LLMs (e.g., llama3.1:8b) to ignore RAG context entirely
2. Language mismatches where context was in one language but responses in another

**Supported Languages:**
- Croatian (hr), English (en), German (de), French (fr)
- Spanish (es), Italian (it), Portuguese (pt), Dutch (nl)
- Polish (pl), Russian (ru), Czech (cs), Slovenian (sl), Serbian (sr)

**Template Structure:**
```
==================== SEPARATOR ====================
IMPORTANT: KNOWLEDGE BASE CONTEXT [in target language]
==================== SEPARATOR ====================

EXAMPLE OF HOW TO USE CONTEXT: [in target language]
  - Shows concrete example of question + context → answer pattern

YOUR CONTEXT:
  [Injected search results here]

==================== SEPARATOR ====================
REMEMBER: Use PRIMARILY the context above to answer! [in target language]
If context doesn't contain the answer, say "I don't have that information..."
Respond ONLY in [target language].
==================== SEPARATOR ====================
```

**API:**
```typescript
getRagTemplate(language: string, context: string, similarity: number, fallback?: string): string
getSupportedLanguages(): string[]
isLanguageSupported(language: string): boolean
```

#### 4. Quality-Based Prompting (NEW - 2025-11-18)

**File:** `apps/api/src/routes/chat.ts` (lines 105-160)

The system now uses similarity scores to determine how aggressively to inject context:

**Similarity Thresholds:**

| Similarity | Quality Level | Behavior |
|-----------|---------------|----------|
| ≥ 70% | HIGH | Inject all results with strong directive prompt |
| 50-70% | MODERATE | Inject with cautious "may not be fully relevant" warning |
| < 50% | LOW | Skip injection entirely to avoid misleading LLM |

**Implementation:**
```typescript
const bestSimilarity = searchResults[0]?.similarity || 0;

if (bestSimilarity >= 0.7) {
  // HIGH QUALITY: Use all results with strong prompt
  const context = buildContext(searchResults, 2000);
  const ragTemplate = getRagTemplate(tenantLanguage, context, bestSimilarity);
  systemPrompt = `${systemPrompt}${ragTemplate}`;

} else if (bestSimilarity >= 0.5) {
  // MODERATE QUALITY: Add caution note before template
  const cautionNote = `Note: Found documents with ${similarityPct}% relevance...`;
  const ragTemplate = getRagTemplate(tenantLanguage, context, bestSimilarity);
  systemPrompt = `${systemPrompt}${cautionNote}${ragTemplate}`;

} else {
  // LOW QUALITY: Skip injection
  console.log(`RAG: LOW quality (${similarityPct}%), skipping injection`);
}
```

This ensures the LLM only receives high-quality context, preventing hallucinations based on irrelevant documents.

### Database Schema

**Documents Table:**
```sql
CREATE TABLE documents (
  id          TEXT PRIMARY KEY,
  tenantId    TEXT NOT NULL,
  filename    TEXT NOT NULL,
  mimeType    TEXT NOT NULL,
  size        INT NOT NULL,
  path        TEXT NOT NULL,
  checksum    TEXT NOT NULL,
  storageProvider TEXT DEFAULT 'local',
  version     INT DEFAULT 1,
  status      TEXT DEFAULT 'pending',
  metadata    JSONB DEFAULT '{}',
  createdAt   TIMESTAMP DEFAULT NOW(),
  updatedAt   TIMESTAMP DEFAULT NOW()
);
```

**Metadata JSON Structure:**
```json
{
  "content": "raw text content",
  "processedAt": "2025-11-18T...",
  "chunkCount": 42,
  "embeddingModel": "mxbai-embed-large",
  "embeddingDimensions": 1024,
  "language": "hr",
  "languageDetectionMethod": "auto"
}
```

**Chunks Table:**
```sql
CREATE TABLE chunks (
  id          TEXT PRIMARY KEY,
  tenantId    TEXT NOT NULL,
  documentId  TEXT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1024),  -- pgvector type
  metadata    JSONB DEFAULT '{}',
  position    INT NOT NULL,
  createdAt   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops);
```

**Chunk Metadata JSON Structure:**
```json
{
  "charStart": 0,
  "charEnd": 500,
  "length": 500,
  "language": "hr"
}
```

## Recent Improvements (2025-11-18)

### 1. Multi-Language RAG Templates

**What Changed:**
- Created `ragTemplates.ts` with 13 language-specific prompt templates
- Each template includes strong directives and concrete examples in the target language
- Fallback mechanism ensures unsupported languages default to English

**Why It Matters:**
- Smaller LLMs (like llama3.1:8b) were ignoring weak prompts like "you can use this context if relevant"
- Language consistency: Croatian context now generates Croatian responses, not English
- Better user experience for non-English tenants

**Code Example:**
```typescript
// Before (generic, weak prompt)
systemPrompt = `${systemPrompt}\n\nContext from knowledge base:\n${context}`;

// After (language-specific, strong directive)
const ragTemplate = getRagTemplate('hr', context, 0.85);
systemPrompt = `${systemPrompt}${ragTemplate}`;
```

### 2. Quality-Based Context Injection

**What Changed:**
- Implemented similarity threshold system (70% high, 50% moderate, <50% skip)
- Added cautious warnings for moderate-quality matches
- Skip injection entirely for low-quality matches

**Why It Matters:**
- Prevents LLM hallucinations from irrelevant context
- Improves answer accuracy by only using high-quality matches
- Better user experience: "I don't know" is better than wrong answer

**Metrics:**
```
High Quality (≥70%):  Strong injection → High accuracy
Moderate (50-70%):    Cautious injection → User aware of uncertainty
Low Quality (<50%):   No injection → Prevents misleading answers
```

### 3. Automatic Language Detection

**What Changed:**
- Integrated franc library for automatic language detection
- Documents auto-tagged with ISO 639-1 language codes
- Chunks inherit document language for filtering

**Why It Matters:**
- No manual language tagging required
- Multi-language knowledge bases in single tenant
- Language-specific search improves relevance

## Deployment & Setup

### Prerequisites

1. **PostgreSQL with pgvector extension:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. **Embedding Provider:**
   - Ollama with `mxbai-embed-large` model (default)
   - OR OpenAI API key for `text-embedding-3-small`

3. **Node.js dependencies:**
```bash
npm install franc  # Language detection
```

### Configuration

**Tenant Settings (stored in `tenants.settings` JSONB):**
```json
{
  "language": "hr",
  "rag": {
    "enabled": true,
    "topK": 5,
    "minSimilarity": 0.5
  },
  "llm": {
    "baseUrl": "http://gpu-01.taildb94e1.ts.net:11434",
    "model": "llama3.1:8b"
  }
}
```

**Environment Variables:**
```bash
# Default Ollama endpoint (used for embeddings)
LLM_BASE_URL=http://gpu-01.taildb94e1.ts.net:11434

# Optional: OpenAI API key for embeddings
OPENAI_API_KEY=sk-...
```

### Enabling RAG for a Tenant

```typescript
await prisma.tenant.update({
  where: { id: tenantId },
  data: {
    settings: {
      rag: {
        enabled: true,
        topK: 5,              // Number of chunks to retrieve
        minSimilarity: 0.5    // Minimum similarity threshold
      }
    }
  }
});
```

### Document Upload & Processing

**Upload Document:**
```bash
POST /api/admin/documents
Content-Type: multipart/form-data

{
  "file": <binary data>,
  "tenantId": "...",
  "metadata": {
    "title": "Product Manual",
    "category": "documentation"
  }
}
```

**Processing Flow:**
1. File saved to local storage with checksum
2. Background job extracts text content
3. Language auto-detected
4. Text chunked into ~500 char segments
5. Embeddings generated via Ollama
6. Chunks stored with embeddings in PostgreSQL
7. Status updated to `indexed`

**Monitor Processing:**
```bash
GET /api/admin/documents?tenantId=...&status=processing
```

### Chunking Configuration

**File:** `apps/api/src/services/chunking.ts`

**Default Settings:**
```typescript
{
  chunkSize: 500,        // Characters per chunk (~100-150 tokens)
  overlap: 50,           // 10% overlap for context continuity
  minChunkSize: 100      // Don't create tiny chunks
}
```

**Chunking Strategy:**
- Prefer breaking at spaces to avoid word splits
- Preserve paragraph boundaries where possible
- Add metadata: `charStart`, `charEnd`, `length`

### Embedding Configuration

**File:** `apps/api/src/services/embedding.ts`

**Model:** `mxbai-embed-large`
- Dimensions: 1024
- Provider: Ollama
- Language support: Multilingual
- Performance: ~100ms per embedding on GPU

**Batch Processing:**
```typescript
{
  batchSize: 5,    // Process 5 chunks at a time
  delayMs: 100     // 100ms delay between batches
}
```

## API Reference

### Vector Search

**Function:** `searchChunks(query, tenantId, embeddingConfig, options)`

**Parameters:**
```typescript
{
  query: string,                    // User's question
  tenantId: string,                 // Tenant ID for isolation
  embeddingConfig: {
    baseUrl: string,                // Ollama endpoint
    model: string                   // Embedding model name
  },
  options: {
    limit?: number,                 // Max results (default: 5)
    minSimilarity?: number,         // Min similarity (default: 0.5)
    documentIds?: string[],         // Optional document filter
    languageFilter?: string         // Optional language filter
  }
}
```

**Returns:**
```typescript
SearchResult[] = [
  {
    chunkId: string,
    documentId: string,
    content: string,
    similarity: number,              // 0-1
    metadata: {
      language: string,
      charStart: number,
      charEnd: number,
      length: number
    },
    position: number
  }
]
```

### Context Building

**Function:** `buildContext(results, maxLength)`

**Example Output:**
```
[Source: Document 12ab34cd, Similarity: 87.3%]
Our store is open Monday-Friday from 09:00 to 20:00...

---

[Source: Document 12ab34cd, Similarity: 82.1%]
On weekends, we operate with reduced hours: 10:00 to 18:00...
```

### RAG Template Generation

**Function:** `getRagTemplate(language, context, similarity, fallback)`

**Example Usage:**
```typescript
const searchResults = await searchChunks(userMessage, tenantId, embeddingConfig);
const context = buildContext(searchResults, 2000);
const bestSimilarity = searchResults[0]?.similarity || 0;

const ragPrompt = getRagTemplate('hr', context, bestSimilarity, 'en');
const finalSystemPrompt = `${baseSystemPrompt}${ragPrompt}`;
```

### Document Processing

**Function:** `processDocument(documentId, options)`

**Options:**
```typescript
{
  embeddingConfig: {
    baseUrl: string,
    model: string
  },
  chunkingOptions?: {
    chunkSize?: number,
    overlap?: number,
    minChunkSize?: number
  }
}
```

**Process:**
1. Fetch document from database
2. Extract content from metadata
3. Detect language using franc
4. Chunk text with overlap
5. Generate embeddings in batches
6. Store chunks with pgvector embeddings
7. Update document status

### Language Detection

**Function:** `detectLanguage(text, defaultLanguage)`

**Supported Languages:**
```typescript
const SUPPORTED = [
  'hr', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl',
  'pl', 'ru', 'uk', 'cs', 'sk', 'sl', 'sr', 'bg',
  'ro', 'hu', 'tr', 'ar', 'he', 'hi', 'ja', 'ko',
  'zh', 'vi', 'th', 'sv', 'da', 'no', 'fi', 'el'
];
```

**Detection Method:**
- Uses franc library with ISO 639-3 to ISO 639-1 mapping
- Minimum 10 characters for reliable detection
- Fallback to default language if uncertain

## Operations

### Monitoring

**Check Indexed Document Count:**
```typescript
const count = await getIndexedDocumentCount(tenantId);
console.log(`Indexed documents: ${count}`);
```

**Check Chunk Count:**
```typescript
const chunkCount = await getChunkCount(tenantId);
console.log(`Total chunks: ${chunkCount}`);
```

**Monitor Processing Status:**
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updatedAt - createdAt))) as avg_processing_time_sec
FROM documents
WHERE tenantId = :tenantId
GROUP BY status;
```

**Check Embedding Quality:**
```sql
-- Find chunks with null embeddings (processing failures)
SELECT documentId, COUNT(*) as null_embedding_count
FROM chunks
WHERE tenantId = :tenantId AND embedding IS NULL
GROUP BY documentId;
```

### Troubleshooting

**Issue: Document stuck in "processing" status**

**Diagnosis:**
```sql
SELECT id, filename, createdAt, updatedAt, metadata
FROM documents
WHERE status = 'processing'
  AND updatedAt < NOW() - INTERVAL '10 minutes';
```

**Resolution:**
```typescript
// Retry processing
await reprocessDocument(documentId, embeddingConfig);
```

**Issue: RAG not injecting context**

**Diagnosis:**
1. Check if RAG is enabled: `tenant.settings.rag.enabled`
2. Check similarity scores: `console.log(searchResults[0]?.similarity)`
3. Verify chunks exist: `SELECT COUNT(*) FROM chunks WHERE tenantId = '...'`
4. Check embedding model is running: `curl http://gpu-01:11434/api/tags`

**Resolution:**
- If similarity < 0.5: Documents may not be relevant, add more specific documents
- If no chunks: Reprocess documents
- If Ollama down: Restart Ollama service or switch to OpenAI embeddings

**Issue: Wrong language responses**

**Diagnosis:**
```typescript
console.log('Tenant language:', tenant.settings.language);
console.log('Document language:', document.metadata.language);
console.log('RAG template language:', getRagTemplate(lang, '', 1).substring(0, 100));
```

**Resolution:**
- Verify tenant `settings.language` is set correctly
- Check document metadata has correct language code
- Ensure RAG template exists for language (fallback to 'en' if not)

**Issue: Low similarity scores across all queries**

**Diagnosis:**
```sql
-- Check embedding dimensions
SELECT
  id,
  array_length(embedding, 1) as dimensions
FROM chunks
LIMIT 1;
```

**Resolution:**
- Verify embedding model is `mxbai-embed-large` (1024 dims)
- If dimension mismatch: Reprocess all documents with correct model
- Check if documents are in different language than queries

### Performance Optimization

**pgvector Index:**
```sql
-- Create IVFFlat index for faster cosine similarity search
CREATE INDEX chunks_embedding_idx
ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- After creating index, analyze table
ANALYZE chunks;
```

**Index Tuning:**
- `lists = 100` for ~10K chunks
- `lists = 1000` for ~1M chunks
- Higher lists = faster search but more memory

**Query Optimization:**
```sql
-- Pre-filter by tenantId before vector search
CREATE INDEX chunks_tenant_idx ON chunks (tenantId);

-- Language filtering index
CREATE INDEX chunks_metadata_language_idx
ON chunks ((metadata->>'language'));
```

**Embedding Caching:**
- Query embeddings could be cached for repeated questions
- Not currently implemented (stateless design)

### Backup & Migration

**Backup Documents & Chunks:**
```bash
pg_dump -h localhost -U postgres -d metachat \
  -t documents -t chunks \
  --data-only \
  > rag_backup_$(date +%Y%m%d).sql
```

**Migrate to Different Embedding Model:**
```typescript
// 1. Update tenant settings
await prisma.tenant.update({
  where: { id: tenantId },
  data: {
    settings: {
      llm: {
        baseUrl: '...',
        model: 'text-embedding-3-small'  // New model
      }
    }
  }
});

// 2. Reprocess all documents
const documents = await prisma.document.findMany({
  where: { tenantId, status: 'indexed' }
});

for (const doc of documents) {
  await reprocessDocument(doc.id, newEmbeddingConfig);
}
```

**Note:** Changing embedding models requires reprocessing all documents because vector dimensions may differ.

## Code References

### Key Files

**RAG System Core:**
- `apps/api/src/services/ragTemplates.ts` - Multi-language prompt templates (NEW)
- `apps/api/src/services/vectorSearch.ts` - Semantic search with pgvector
- `apps/api/src/services/documentProcessor.ts` - Document processing pipeline
- `apps/api/src/services/embedding.ts` - Embedding generation (Ollama/OpenAI)
- `apps/api/src/services/chunking.ts` - Text chunking with overlap
- `apps/api/src/services/languageDetection.ts` - Automatic language detection

**Integration Points:**
- `apps/api/src/routes/chat.ts` - RAG integration in chat endpoint (lines 75-160)
- `apps/api/src/routes/documents.ts` - Document upload and management API
- `packages/database/prisma/schema.prisma` - Database schema (Document, Chunk models)

**Database:**
- PostgreSQL 14+ with pgvector extension
- Models: `Document`, `Chunk`, `Tenant`

### Example: Full RAG Flow

```typescript
// 1. User sends a message
const userMessage = "Kada radite vikendom?";

// 2. System checks if RAG is enabled
const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
const enableRag = tenant.settings.rag?.enabled || false;

if (enableRag) {
  // 3. Generate query embedding
  const embeddingConfig = await getEmbeddingConfig(tenantId);
  const queryEmbedding = await generateQueryEmbedding(userMessage, embeddingConfig);

  // 4. Search for similar chunks
  const searchResults = await searchChunks(
    userMessage,
    tenantId,
    embeddingConfig,
    { limit: 5, minSimilarity: 0.5 }
  );
  // Results: [
  //   { content: "Vikendom radimo 10:00-18:00", similarity: 0.87 },
  //   { content: "Subotom produženo do 19:00", similarity: 0.72 }
  // ]

  // 5. Quality-based context injection
  const bestSimilarity = searchResults[0]?.similarity || 0;

  if (bestSimilarity >= 0.7) {
    // HIGH QUALITY
    const context = buildContext(searchResults, 2000);
    // Context:
    // [Source: Document 12ab34cd, Similarity: 87.0%]
    // Vikendom radimo 10:00-18:00
    // ---
    // [Source: Document 12ab34cd, Similarity: 72.0%]
    // Subotom produženo do 19:00

    const tenantLanguage = tenant.settings.language || 'en';
    const ragTemplate = getRagTemplate(tenantLanguage, context, bestSimilarity);
    // Template (Croatian):
    // ========================================
    // VAŽNO: KONTEKST IZ BAZE ZNANJA
    // ========================================
    // PRIMJER KAKO KORISTITI KONTEKST: ...
    // TVOJ KONTEKST:
    // [context here]
    // ========================================
    // UPAMTI: Koristi PRVENSTVENO gornji kontekst za odgovor!
    // ========================================

    systemPrompt = `${systemPrompt}${ragTemplate}`;
  }

  // 6. Call LLM with augmented prompt
  const response = await callLlm({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    ...llmConfig
  });
  // Response: "Prema bazi znanja, vikendom radimo od 10:00 do 18:00,
  //            a subotom imamo produženo radno vrijeme do 19:00."
}
```

## Related Documentation

- **Deployment Guide:** `docs/current/ops/deployment.md`
- **API Documentation:** `docs/current/api/routes.md`
- **Database Schema:** `docs/current/db/schema.md`
- **LLM Providers:** `docs/current/features/llm-providers.md`
- **Multi-tenancy:** `docs/current/architecture/multi-tenancy.md`

## Future Enhancements

**Planned:**
- Hybrid search (combine vector + keyword search)
- Reranking with cross-encoder models
- Chunk overlap optimization based on document type
- Query expansion for better recall
- User feedback loop for relevance tuning

**Under Consideration:**
- Support for PDF, DOCX, and other formats (currently text only)
- Metadata filtering (by document category, date, etc.)
- Multi-query retrieval (generate multiple search queries)
- Contextual compression (summarize long contexts)
- Embedding model hot-swapping without downtime

---

**Questions or Issues?**
Contact the AI/ML Team or file an issue in the repository.
