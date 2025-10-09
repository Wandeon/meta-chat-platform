import { describe, expect, it, vi } from 'vitest';

import { createLLMProvider } from '../../factory';
import { AnthropicProvider } from '../anthropic';
import { OllamaProvider } from '../ollama';
import { OpenAIProvider } from '../openai';

vi.mock('openai', () => ({
  default: class MockOpenAI {
    public chat = { completions: { create: vi.fn() } };
    public embeddings = { create: vi.fn() };
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    public messages = {
      create: vi.fn(),
      stream: vi.fn(),
    };
  },
}));

describe('createLLMProvider', () => {
  it('creates an OpenAI provider', () => {
    const provider = createLLMProvider({ provider: 'openai', model: 'gpt-4' });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('creates an Anthropic provider', () => {
    const provider = createLLMProvider({ provider: 'anthropic', model: 'claude-3' });
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('creates an Ollama provider', () => {
    const provider = createLLMProvider({ provider: 'ollama', model: 'llama2' });
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('throws for unsupported providers', () => {
    expect(() =>
      createLLMProvider({ provider: 'unsupported' as any, model: 'test' }),
    ).toThrow(/unsupported/i);
  });
});
