import { BaseLLMProvider } from './base';
import { CompletionParams, CompletionResponse, ProviderInfo } from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  protected async doComplete(_params: CompletionParams): Promise<CompletionResponse> {
    throw new Error('OpenAI provider not implemented yet');
  }

  public getInfo(): ProviderInfo {
    return {
      name: 'openai',
      capabilities: {
        streaming: true,
        embeddings: true,
        functionCalling: true,
      },
      limits: {
        maxRequestsPerMinute: 5_000,
      },
    };
  }
}
