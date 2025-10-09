import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAIProvider } from '../openai';
import { CostTracker } from '../../utils/cost-tracker';
import type { ProviderConfig } from '../../types';

const createMock = vi.fn();
const embeddingsMock = vi.fn();
const mockInstances: any[] = [];

vi.mock('openai', () => ({
  default: class MockOpenAI {
    public chat = { completions: { create: createMock } };
    public embeddings = { create: embeddingsMock };

    constructor(options: any) {
      mockInstances.push(options);
    }
  },
}));

vi.mock('openai/error', () => ({
  APIError: class APIError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'APIError';
    }
  },
}));

describe('OpenAIProvider', () => {
  let costTracker: CostTracker;
  let baseConfig: ProviderConfig;

  beforeEach(() => {
    createMock.mockReset();
    embeddingsMock.mockReset();
    mockInstances.length = 0;
    costTracker = new CostTracker();
    baseConfig = {
      provider: 'openai',
      apiKey: 'key',
      model: 'gpt-4',
      costTracker,
      pricing: {
        promptTokenUsdPer1K: 0.5,
        completionTokenUsdPer1K: 1.0,
      },
    };
  });

  it('creates a completion and tracks usage', async () => {
    const provider = new OpenAIProvider(baseConfig);

    createMock.mockResolvedValueOnce({
      id: 'resp-id',
      created: 123,
      model: 'gpt-4',
      choices: [
        {
          message: {
            content: 'Hello',
            function_call: { name: 'lookup', arguments: '{"foo":1}' },
            tool_calls: [
              {
                id: 'tool-1',
                type: 'function',
                function: { name: 'search', arguments: '{"bar":2}' },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    });

    const response = await provider.complete({
      messages: [{ role: 'user', content: 'Hi there' }],
      functions: [
        {
          name: 'lookup',
          description: 'Lookup function',
          parameters: { type: 'object' },
        },
      ],
      metadata: { traceId: '123' },
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toMatchObject({
      model: 'gpt-4',
      metadata: { traceId: '123' },
    });
    expect(response.content).toBe('Hello');
    expect(response.functionCall).toEqual({ name: 'lookup', arguments: '{"foo":1}' });
    expect(response.toolCalls?.[0].function).toEqual({ name: 'search', arguments: '{"bar":2}' });
    expect(response.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      costInUsd: 0.01,
    });

    const costEntries = costTracker.getAll();
    expect(costEntries).toHaveLength(1);
    expect(costEntries[0]).toMatchObject({
      provider: 'openai',
      model: 'gpt-4',
      promptTokens: 10,
      completionTokens: 5,
    });
    expect(costEntries[0].costInUsd).toBeCloseTo(0.01, 5);
    expect(mockInstances[0]).toMatchObject({ apiKey: 'key' });
  });

  it('streams completions and forwards chunks', async () => {
    const provider = new OpenAIProvider(baseConfig);

    const stream = (async function* () {
      yield {
        id: 'chunk-1',
        created: 10,
        model: 'gpt-4',
        choices: [{ delta: { content: 'Hello' } }],
      };
      yield {
        id: 'chunk-1',
        created: 11,
        model: 'gpt-4',
        usage: {
          prompt_tokens: 1,
          completion_tokens: 2,
          total_tokens: 3,
        },
        choices: [{ delta: {}, finish_reason: 'stop' }],
      };
    })();

    createMock.mockResolvedValueOnce(stream);

    const chunks: any[] = [];
    for await (const chunk of provider.streamComplete({ messages: [{ role: 'user', content: 'Hi' }] })) {
      chunks.push(chunk);
    }

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
    expect(chunks).toHaveLength(2);
    expect(chunks[0].delta.content).toBe('Hello');
    expect(chunks[1].delta.usage).toEqual({
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
      costInUsd: 0.0025,
    });
    expect(chunks[1].done).toBe(true);

    const costEntries = costTracker.getAll();
    expect(costEntries).toHaveLength(1);
    expect(costEntries[0].promptTokens).toBe(1);
  });

  it('creates embeddings', async () => {
    const provider = new OpenAIProvider(baseConfig);
    embeddingsMock.mockResolvedValueOnce({
      data: [
        { embedding: [0.1, 0.2] },
        { embedding: [0.3, 0.4] },
      ],
    });

    const embeddings = await provider.embed(['foo', 'bar']);
    expect(embeddingsMock).toHaveBeenCalledWith({ input: ['foo', 'bar'], model: 'gpt-4' });
    expect(embeddings).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });
});
