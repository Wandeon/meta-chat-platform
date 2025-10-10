-- Update embedding column from vector(1536) to vector(1024) for mxbai-embed-large model
-- First drop the old index
DROP INDEX IF EXISTS "chunks_embedding_ivfflat_idx";

-- Alter the column type (this will clear existing embeddings if any)
ALTER TABLE "chunks" ALTER COLUMN "embedding" TYPE vector(1024);

-- Recreate the IVFFlat index with the new dimensions
CREATE INDEX IF NOT EXISTS "chunks_embedding_ivfflat_idx"
ON "chunks" USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Update statistics
ANALYZE "chunks";
