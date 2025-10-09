import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OllamaProvider } from '../ollama';
import { CostTracker } from '../../utils/cost-tracker';
import type { ProviderConfig } from '../../types';

describe('OllamaProvider', () => {
  let httpClient: ReturnType<typeof vi.fn>;
  let costTracker: CostTracker;
  let baseConfig: ProviderConfig;

  beforeEach(() => {
    httpClient = vi.fn();
    costTracker = new CostTracker();
    baseConfig = {
      provider: 'ollama',
      model: 'llama2',
      httpClient: httpClient as any,
      costTracker,
      pricing: {
        promptTokenUsdPer1K: 0.2,
        completionTokenUsdPer1K: 0.4,
      },
    };
  });

  it('sends chat completion requests and maps usage', async () => {
    const provider = new OllamaProvider(baseConfig);

    httpClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'ollama-1',
        created_at: '2024-01-01T00:00:00Z',
        model: 'llama2',
        message: { content: 'Hello from Ollama' },
        prompt_eval_count: 10,
        eval_count: 5,
      }),
    });

    const response = await provider.complete({
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.2,
      topP: 0.9,
      maxTokens: 64,
    });

    expect(httpClient).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(response.content).toBe('Hello from Ollama');
    expect(response.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      costInUsd: 0.004,
    });
    expect(costTracker.getAll()[0].costInUsd).toBeCloseTo(0.004, 5);
  });

  it('streams chat responses', async () => {
    const provider = new OllamaProvider(baseConfig);

    const stream = (async function* () {
      yield Buffer.from('{"message":{"content":"Hello"},"model":"llama2"}\n');
      yield Buffer.from('{"done":true,"prompt_eval_count":1,"eval_count":2,"model":"llama2"}\n');
    })();

    httpClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: stream,
    });

    const chunks: any[] = [];
    for await (const chunk of provider.streamComplete({
      messages: [{ role: 'user', content: 'Stream please' }],
    })) {
      chunks.push(chunk);
    }

    expect(httpClient).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(chunks).toHaveLength(2);
    expect(chunks[0].delta.content).toContain('Hello');
    expect(chunks[1].delta.usage).toEqual({
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
      costInUsd: 0.001,
    });
    expect(chunks[1].done).toBe(true);
  });

  it('creates embeddings through the REST API', async () => {
    const provider = new OllamaProvider(baseConfig);

    httpClient.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        embeddings: [
          { embedding: [0.1, 0.2] },
          { embedding: [0.3, 0.4] },
        ],
      }),
    });

    const embeddings = await provider.embed(['foo', 'bar']);
    expect(httpClient).toHaveBeenCalledWith(
      expect.stringContaining('/api/embeddings'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(embeddings).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });
});
