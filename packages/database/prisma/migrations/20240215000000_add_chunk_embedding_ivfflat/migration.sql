-- Create IVFFlat index on chunk embeddings for efficient cosine similarity search
-- Prisma cannot express IVFFlat indexes directly, so we manage it via SQL.
CREATE INDEX IF NOT EXISTS "chunks_embedding_ivfflat_idx"
ON "chunks" USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Ensure planner statistics are updated after creating the index
ANALYZE "chunks";
