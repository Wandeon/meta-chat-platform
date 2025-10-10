/**
 * Embedding Service - Generates vector embeddings using Ollama
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

/**
 * Generate embedding for a single text using Ollama
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
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

  return {
    embedding: data.embedding,
    model: config.model,
    dimensions: data.embedding.length,
  };
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig,
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<EmbeddingResult[]> {
  const batchSize = options.batchSize || 10;
  const delayMs = options.delayMs || 100; // Small delay between batches to avoid overwhelming the server

  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text, config))
    );

    results.push(...batchResults);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < texts.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Generate embedding for a question/query
 * This uses the same embedding model as documents to ensure compatibility
 */
export async function generateQueryEmbedding(
  query: string,
  config: EmbeddingConfig
): Promise<number[]> {
  const result = await generateEmbedding(query, config);
  return result.embedding;
}
