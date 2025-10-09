import { BaseLLMProvider } from './base';
import { CompletionParams, CompletionResponse, ProviderInfo } from '../types';

export class AnthropicProvider extends BaseLLMProvider {
  protected async doComplete(_params: CompletionParams): Promise<CompletionResponse> {
    throw new Error('Anthropic provider not implemented yet');
  }

  public getInfo(): ProviderInfo {
    return {
      name: 'anthropic',
      capabilities: {
        streaming: true,
        embeddings: false,
        functionCalling: true,
      },
      limits: {
        contextWindow: '200k tokens',
      },
    };
  }
}
