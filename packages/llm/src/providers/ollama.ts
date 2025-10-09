import { BaseLLMProvider } from './base';
import { CompletionParams, CompletionResponse, ProviderInfo } from '../types';

export class OllamaProvider extends BaseLLMProvider {
  protected async doComplete(_params: CompletionParams): Promise<CompletionResponse> {
    throw new Error('Ollama provider not implemented yet');
  }

  public getInfo(): ProviderInfo {
    return {
      name: 'ollama',
      capabilities: {
        streaming: true,
        embeddings: false,
        functionCalling: false,
      },
      limits: {
        note: 'Depends on local hardware and model',
      },
    };
  }
}
