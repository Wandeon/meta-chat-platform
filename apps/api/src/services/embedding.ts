/**
 * Embedding Service - Generates vector embeddings using Ollama
 * 
 * ISSUE-017 FIX: Added retry logic with exponential backoff for resilient embedding generation
 */

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface EmbeddingConfig {
  baseUrl: string;
  model: string; // e.g., "mxbai-embed-large"
}

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate embedding for a single text using Ollama with retry logic
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[EmbeddingService] Generating embedding (attempt ${attempt}/${MAX_RETRIES})`);
      
      const response = await fetch(`${config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama embedding API error: ${response.status} ${response.statusText}`
        );
      }

      const data: any = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response from Ollama');
      }

      console.log(`[EmbeddingService] Embedding generated successfully (dimensions: ${data.embedding.length})`);

      return {
        embedding: data.embedding,
        model: config.model,
        dimensions: data.embedding.length,
      };
      
    } catch (error) {
      lastError = error as Error;
      
      console.warn(`[EmbeddingService] Embedding generation failed on attempt ${attempt}/${MAX_RETRIES}`, {
        error: lastError.message,
      });
      
      // If this isn't the last attempt, wait with exponential backoff
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 2^attempt * BASE_DELAY_MS
        const delayMs = Math.pow(2, attempt) * BASE_DELAY_MS;
        console.log(`[EmbeddingService] Retrying after ${delayMs}ms delay...`);
        await sleep(delayMs);
      }
    }
  }
  
  // All retries failed
  const errorMessage = `Failed to generate embedding after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`;
  console.error(`[EmbeddingService] ${errorMessage}`);
  throw new Error(errorMessage);
}

/**
 * Generate embeddings for multiple texts in batch with retry logic
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig,
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<EmbeddingResult[]> {
  const batchSize = options.batchSize || 10;
  const delayMs = options.delayMs || 100; // Small delay between batches to avoid overwhelming the server

  const results: EmbeddingResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  console.log(`[EmbeddingService] Starting batch embedding generation for ${texts.length} texts`);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(texts.length / batchSize);
    
    console.log(`[EmbeddingService] Processing batch ${batchNumber}/${totalBatches} (size: ${batch.length})`);

    try {
      // Process batch in parallel - each generateEmbedding call has its own retry logic
      const batchResults = await Promise.all(
        batch.map((text) => generateEmbedding(text, config))
      );

      results.push(...batchResults);
      successCount += batchResults.length;

      // Add delay between batches (except for the last batch)
      if (i + batchSize < texts.length && delayMs > 0) {
        await sleep(delayMs);
      }
    } catch (error) {
      failureCount += batch.length;
      // Re-throw the error to propagate to documentProcessor
      throw error;
    }
  }

  console.log(`[EmbeddingService] Batch embedding completed`, {
    total: texts.length,
    successful: successCount,
    failed: failureCount,
  });

  return results;
}

/**
 * Generate embedding for a question/query with retry logic
 * This uses the same embedding model as documents to ensure compatibility
 */
export async function generateQueryEmbedding(
  query: string,
  config: EmbeddingConfig
): Promise<number[]> {
  const result = await generateEmbedding(query, config);
  return result.embedding;
}
