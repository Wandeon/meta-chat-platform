import type { RequestInit, Response } from 'node-fetch';
import type { CostTracker } from './utils/cost-tracker';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface ToolDefinition {
  type: 'function';
  function: FunctionDefinition;
}

export interface ToolCall {
  id?: string;
  type: string;
  function: FunctionCall;
}

export interface CompletionMessage {
  role: Role;
  content: string;
  name?: string;
  toolCallId?: string;
  functionCall?: FunctionCall;
  toolCalls?: ToolCall[];
}

export interface CompletionParams {
  messages: CompletionMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  functions?: FunctionDefinition[];
  functionCall?: 'auto' | 'none' | FunctionCall;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
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
  functionCall?: FunctionCall;
  toolCalls?: ToolCall[];
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
  httpClient?: FetchLike;
  costTracker?: CostTracker;
  pricing?: PricingConfig;
  additionalHeaders?: Record<string, string>;
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

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface PricingConfig {
  promptTokenUsdPer1K?: number;
  completionTokenUsdPer1K?: number;
}
