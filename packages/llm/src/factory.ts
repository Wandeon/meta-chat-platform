import { AnthropicProvider } from './providers/anthropic';
import { BaseLLMProvider } from './providers/base';
import { OllamaProvider } from './providers/ollama';
import { OpenAIProvider } from './providers/openai';
import { LLMProvider, ProviderConfig } from './types';

export function createLLMProvider(config: ProviderConfig): LLMProvider {
  const provider = getProviderInstance(config);

  if (!provider) {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }

  return provider;
}

function getProviderInstance(config: ProviderConfig): BaseLLMProvider | null {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      return null;
  }
}
