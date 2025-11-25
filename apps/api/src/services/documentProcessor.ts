/**
 * Document Processor - Orchestrates chunking and embedding of documents
 */

import { getPrismaClient } from '@meta-chat/database';
import { chunkDocument, type ChunkingOptions } from './chunking';
import { generateEmbeddingsBatch, type EmbeddingConfig } from './embedding';
import { createId } from '@paralleldrive/cuid2';
import { detectLanguage } from './languageDetection';

const prisma = getPrismaClient();

export interface ProcessDocumentOptions {
  embeddingConfig: EmbeddingConfig;
  chunkingOptions?: ChunkingOptions;
}

/**
 * Process a document: chunk it and generate embeddings
 */
export async function processDocument(
  documentId: string,
  options: ProcessDocumentOptions
): Promise<void> {
  console.log(`[DocumentProcessor] Starting processing for document ${documentId}`);

  try {
    // Fetch the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Update status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });

    // Extract content from metadata
    const content = (document.metadata as any)?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Document content not found in metadata');
    }

    // Detect document language
    const detectedLanguage = detectLanguage(content);
    console.log(`[DocumentProcessor] Detected language: ${detectedLanguage}`);

    console.log(`[DocumentProcessor] Chunking document (${content.length} chars)`);

    // Chunk the document
    const chunks = chunkDocument(content, document.mimeType, options.chunkingOptions);

    if (chunks.length === 0) {
      throw new Error('No chunks generated from document');
    }

    console.log(`[DocumentProcessor] Generated ${chunks.length} chunks`);

    // Generate embeddings for all chunks
    console.log(`[DocumentProcessor] Generating embeddings...`);
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddingsBatch(
      chunkTexts,
      options.embeddingConfig,
      { batchSize: 5, delayMs: 100 } // Process 5 at a time with small delay
    );

    console.log(`[DocumentProcessor] Generated ${embeddings.length} embeddings`);

    // Delete existing chunks for this document (in case of reprocessing)
    await prisma.chunk.deleteMany({
      where: { documentId },
    });

    // Save chunks with embeddings to database
    console.log(`[DocumentProcessor] Saving chunks to database...`);

    // Insert chunks one by one (Prisma doesn't support vector type in createMany)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i].embedding;
      const embeddingStr = `[${embedding.join(',')}]`;
      const chunkId = createId();

      // Add language to chunk metadata for filtering during RAG search
      const chunkMetadata = {
        ...chunk.metadata,
        language: detectedLanguage,
      };

      await prisma.$executeRaw`
        INSERT INTO "chunks" (
          id, "tenantId", "documentId", content, embedding, metadata, position, "createdAt"
        ) VALUES (
          ${chunkId},
          ${document.tenantId},
          ${documentId},
          ${chunk.content},
          ${embeddingStr}::vector,
          ${JSON.stringify(chunkMetadata)}::jsonb,
          ${chunk.position},
          NOW()
        )
      `;
    }

    // Update document status to indexed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'ready',
        metadata: {
          ...(document.metadata as any),
          processedAt: new Date().toISOString(),
          chunkCount: chunks.length,
          embeddingModel: options.embeddingConfig.model,
          embeddingDimensions: embeddings[0].dimensions,
          language: detectedLanguage, // Auto-detected language (ISO 639-1)
          languageDetectionMethod: 'auto',
        },
      },
    });

    console.log(`[DocumentProcessor] Successfully processed document ${documentId}`);
  } catch (error) {
    console.error(`[DocumentProcessor] Failed to process document ${documentId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      documentId,
    });

    // Update status to failed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString(),
        },
      },
    });

    throw error;
  }
}

/**
 * Reprocess a document (delete old chunks and create new ones)
 */
export async function reprocessDocument(
  documentId: string,
  options: ProcessDocumentOptions
): Promise<void> {
  console.log(`[DocumentProcessor] Reprocessing document ${documentId}`);
  await processDocument(documentId, options);
}

/**
 * Get default embedding config from tenant settings
 */
export async function getEmbeddingConfig(tenantId: string): Promise<EmbeddingConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  const settings = tenant.settings as any;
  const llmConfig = settings?.llm || {};

  // Use the same Ollama instance as the LLM, but with embedding model
  const baseUrl = llmConfig.baseUrl || 'http://gpu-01.taildb94e1.ts.net:11434';

  return {
    baseUrl,
    model: 'mxbai-embed-large', // Default embedding model
  };
}
