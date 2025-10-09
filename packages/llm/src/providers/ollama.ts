import fetch from 'node-fetch';
import { BaseLLMProvider } from './base';
import {
  CompletionChunk,
  CompletionParams,
  CompletionResponse,
  FetchLike,
  ProviderConfig,
  ProviderInfo,
} from '../types';

export class OllamaProvider extends BaseLLMProvider {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.fetchImpl = config.httpClient ?? this.httpClient ?? (fetch as unknown as FetchLike);
  }

  protected async doComplete(params: CompletionParams): Promise<CompletionResponse> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.additionalHeaders ?? {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          stream: false,
          messages: params.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          options: {
            temperature: params.temperature,
            top_p: params.topP,
            num_predict: params.maxTokens,
          },
          metadata: params.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
      }

      const payload: any = await response.json();
      const completion: CompletionResponse = {
        id: payload.id ?? payload.created_at ?? `ollama-${Date.now()}`,
        created: payload.created_at ? Date.parse(payload.created_at) : Date.now(),
        model: payload.model ?? this.config.model,
        content: payload.message?.content ?? payload.response ?? '',
        usage: this.mapUsage(payload),
        raw: payload,
      };

      return completion;
    } catch (error) {
      throw this.translateError(error);
    }
  }

  protected async doStreamComplete(params: CompletionParams): Promise<AsyncIterable<CompletionChunk>> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.additionalHeaders ?? {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          stream: true,
          messages: params.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          options: {
            temperature: params.temperature,
            top_p: params.topP,
            num_predict: params.maxTokens,
          },
          metadata: params.metadata,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama streaming request failed with status ${response.status}`);
      }

      const iterator = this.buildStreamIterator(response.body as AsyncIterable<Uint8Array>);
      return iterator;
    } catch (error) {
      throw this.translateError(error);
    }
  }

  protected async doEmbed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.additionalHeaders ?? {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding request failed with status ${response.status}`);
      }

      const payload: any = await response.json();

      if (Array.isArray(payload.embeddings)) {
        return payload.embeddings.map((entry: any) => entry.embedding ?? entry);
      }

      if (Array.isArray(payload.embedding)) {
        return [payload.embedding];
      }

      throw new Error('Invalid embedding response from Ollama');
    } catch (error) {
      throw this.translateError(error);
    }
  }

  public getInfo(): ProviderInfo {
    return {
      name: 'ollama',
      capabilities: {
        streaming: true,
        embeddings: true,
        functionCalling: false,
      },
      limits: {
        note: 'Depends on local hardware and model',
      },
    };
  }

  private buildStreamIterator(body: AsyncIterable<Uint8Array>): AsyncIterable<CompletionChunk> {
    const safeJson = this.safeJson.bind(this);
    const mapStreamPayload = this.mapStreamPayload.bind(this);
    const decoder = new TextDecoder();

    async function* iterator(): AsyncGenerator<CompletionChunk> {
      let buffer = '';
      for await (const chunk of body) {
        buffer += decoder.decode(chunk, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) {
            const payload = safeJson(line);
            if (payload) {
              const completionChunk = mapStreamPayload(payload);
              if (completionChunk) {
                yield completionChunk;
              }
            }
          }

          newlineIndex = buffer.indexOf('\n');
        }
      }

      const remaining = buffer.trim();
      if (remaining) {
        const payload = safeJson(remaining);
        if (payload) {
          const chunk = mapStreamPayload(payload);
          if (chunk) {
            yield chunk;
          }
        }
      }
    }

    return { [Symbol.asyncIterator]: iterator };
  }

  private mapUsage(payload: any): CompletionResponse['usage'] {
    if (!payload) {
      return undefined;
    }

    const promptTokens = payload.prompt_eval_count ?? payload.promptEvalCount ?? 0;
    const completionTokens = payload.eval_count ?? payload.evalCount ?? 0;
    const totalTokens = promptTokens + completionTokens;

    if (!promptTokens && !completionTokens) {
      return undefined;
    }

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      costInUsd: payload.cost_in_usd ?? payload.costInUsd,
    };
  }

  private mapStreamPayload(payload: any): CompletionChunk | null {
    if (!payload) {
      return null;
    }

    const chunk: CompletionChunk = {
      id: payload.id ?? payload.created_at ?? `ollama-${Date.now()}`,
      created: payload.created_at ? Date.parse(payload.created_at) : Date.now(),
      delta: {},
    };

    if (payload.model) {
      chunk.delta.model = payload.model;
    }

    if (payload.message?.content || payload.response) {
      chunk.delta.content = payload.message?.content ?? payload.response ?? '';
    }

    const usage = this.mapUsage(payload);
    if (usage) {
      chunk.delta.usage = usage;
    }

    if (payload.done) {
      chunk.done = true;
    }

    if (!chunk.done && !Object.keys(chunk.delta).length) {
      return null;
    }

    return chunk;
  }

  private safeJson(line: string): any {
    try {
      return JSON.parse(line);
    } catch (error) {
      return null;
    }
  }

  private translateError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown Ollama provider error');
  }
}
