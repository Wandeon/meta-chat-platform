export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface CompletionMessage {
  role: Role;
  content: string;
  name?: string;
}

export interface CompletionParams {
  messages: CompletionMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  functions?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface CompletionChunk {
  id: string;
  created: number;
  delta: Partial<CompletionResponse>;
  done?: boolean;
}

export interface CompletionResponse {
  id: string;
  created: number;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costInUsd?: number;
  };
  raw?: unknown;
}

export interface ProviderInfo {
  name: string;
  capabilities: {
    streaming: boolean;
    embeddings: boolean;
    functionCalling: boolean;
  };
  limits?: Record<string, unknown>;
}

export interface ProviderConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  apiKey?: string;
  model: string;
  baseUrl?: string;
  organizationId?: string;
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  circuitBreaker?: Partial<CircuitBreakerOptions>;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitter?: boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxCalls: number;
}

export interface LLMProvider {
  complete(params: CompletionParams): Promise<CompletionResponse>;
  streamComplete(params: CompletionParams): AsyncIterable<CompletionChunk>;
  embed(texts: string[]): Promise<number[][]>;
  getInfo(): ProviderInfo;
}
