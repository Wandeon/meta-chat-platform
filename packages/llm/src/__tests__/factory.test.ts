import { describe, expect, it } from 'vitest';
import { createLLMProvider } from '../factory';

const baseConfig = {
  apiKey: 'test-key',
  timeoutMs: 1000,
  model: 'gpt-test',
};

describe('createLLMProvider', () => {
  it('creates known providers with default metadata', () => {
    const openai = createLLMProvider({ ...baseConfig, provider: 'openai' });
    expect(openai.getInfo().name).toBe('openai');

    const anthropic = createLLMProvider({ ...baseConfig, provider: 'anthropic' });
    expect(anthropic.getInfo().name).toBe('anthropic');

    const ollama = createLLMProvider({
      ...baseConfig,
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
    });
    expect(ollama.getInfo().name).toBe('ollama');
  });

  it('throws for unsupported providers', () => {
    expect(() => createLLMProvider({ ...baseConfig, provider: 'mystery' as any })).toThrowError(
      'Unsupported LLM provider',
    );
  });
});
