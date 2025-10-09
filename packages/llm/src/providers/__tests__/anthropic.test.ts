import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnthropicProvider } from '../anthropic';
import { CostTracker } from '../../utils/cost-tracker';
import type { ProviderConfig } from '../../types';

const createMock = vi.fn();
const streamMock = vi.fn();
const mockInstances: any[] = [];

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    public messages = {
      create: createMock,
      stream: streamMock,
    };

    constructor(options: any) {
      mockInstances.push(options);
    }
  },
}));

vi.mock('@anthropic-ai/sdk/error', () => ({
  APIError: class APIError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'APIError';
    }
  },
}));

describe('AnthropicProvider', () => {
  let costTracker: CostTracker;
  let baseConfig: ProviderConfig;

  beforeEach(() => {
    createMock.mockReset();
    streamMock.mockReset();
    mockInstances.length = 0;
    costTracker = new CostTracker();
    baseConfig = {
      provider: 'anthropic',
      apiKey: 'anthropic-key',
      model: 'claude-3',
      costTracker,
      pricing: {
        promptTokenUsdPer1K: 1,
        completionTokenUsdPer1K: 2,
      },
    };
  });

  it('creates a completion with tool calls and usage', async () => {
    const provider = new AnthropicProvider(baseConfig);

    createMock.mockResolvedValueOnce({
      id: 'anthropic-1',
      created_at: '2024-01-01T00:00:00Z',
      model: 'claude-3',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'tool_use', id: 'call-1', name: 'lookup', input: { query: 'foo' } },
      ],
      usage: { input_tokens: 4, output_tokens: 6 },
    });

    const response = await provider.complete({
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello!' },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'lookup',
            description: 'Lookup tool',
            parameters: { type: 'object' },
          },
        },
      ],
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.system).toContain('You are helpful');
    expect(callArgs.tools[0].name).toBe('lookup');
    expect(response.content).toBe('Hello');
    expect(response.toolCalls?.[0]).toEqual({
      id: 'call-1',
      type: 'function',
      function: { name: 'lookup', arguments: JSON.stringify({ query: 'foo' }) },
    });
    expect(response.usage).toEqual({
      promptTokens: 4,
      completionTokens: 6,
      totalTokens: 10,
      costInUsd: 0.016,
    });

    const costEntries = costTracker.getAll();
    expect(costEntries).toHaveLength(1);
    expect(costEntries[0].promptTokens).toBe(4);
  });

  it('streams completions and emits chunks', async () => {
    const provider = new AnthropicProvider(baseConfig);

    const stream = (async function* () {
      yield {
        id: 'chunk-1',
        created_at: '2024-01-01T00:00:00Z',
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Partial' },
      };
      yield {
        id: 'chunk-1',
        type: 'message_delta',
        usage: { input_tokens: 2, output_tokens: 3 },
      };
      yield {
        id: 'chunk-1',
        type: 'message_stop',
      };
    })();

    streamMock.mockResolvedValueOnce(stream);

    const chunks: any[] = [];
    for await (const chunk of provider.streamComplete({
      messages: [{ role: 'user', content: 'Hi' }],
    })) {
      chunks.push(chunk);
    }

    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(chunks[0].delta.content).toBe('Partial');
    expect(chunks[1].delta.usage).toEqual({
      promptTokens: 2,
      completionTokens: 3,
      totalTokens: 5,
      costInUsd: 0.008,
    });
    expect(chunks[1].done).toBe(true);
    expect(costTracker.getAll()[0].completionTokens).toBe(3);
  });

  it('throws for embeddings', async () => {
    const provider = new AnthropicProvider(baseConfig);
    await expect(provider.embed(['foo'])).rejects.toThrow(/not supported/i);
  });
});
