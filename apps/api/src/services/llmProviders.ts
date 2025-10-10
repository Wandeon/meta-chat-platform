/**
 * LLM Provider Service
 * Unified interface for calling different LLM providers (OpenAI, DeepSeek, Ollama)
 */

import { McpTool } from './mcpClient';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string; // For tool responses
  tool_call_id?: string; // For tool responses
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LlmResponse {
  message: string;
  toolCalls?: LlmToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  metadata: {
    model: string;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    latency: number;
  };
}

export interface LlmConfig {
  provider: 'openai' | 'deepseek' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call OpenAI with function calling support
 */
export async function callOpenAI(
  config: LlmConfig,
  messages: LlmMessage[],
  tools?: McpTool[]
): Promise<LlmResponse> {
  const startTime = Date.now();
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const body: any = {
    model: config.model || 'gpt-4o',
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name && { name: m.name }),
      ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
    })),
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2000,
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    body.tools = tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data: any = await response.json();
  const choice = data.choices[0];
  const latency = Date.now() - startTime;

  // Check if model wants to call tools
  const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  }));

  return {
    message: choice.message.content || '',
    toolCalls,
    finishReason: choice.finish_reason,
    metadata: {
      model: data.model,
      tokens: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      latency,
    },
  };
}

/**
 * Call DeepSeek with function calling support
 */
export async function callDeepSeek(
  config: LlmConfig,
  messages: LlmMessage[],
  tools?: McpTool[]
): Promise<LlmResponse> {
  const startTime = Date.now();
  const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY;
  const baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';

  if (!apiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  const body: any = {
    model: config.model || 'deepseek-chat',
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name && { name: m.name }),
      ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
    })),
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2000,
  };

  // Add tools if provided (DeepSeek supports OpenAI-compatible function calling)
  if (tools && tools.length > 0) {
    body.tools = tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
    body.tool_choice = 'auto';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  const data: any = await response.json();
  const choice = data.choices[0];
  const latency = Date.now() - startTime;

  // Check if model wants to call tools
  const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  }));

  return {
    message: choice.message.content || '',
    toolCalls,
    finishReason: choice.finish_reason,
    metadata: {
      model: data.model,
      tokens: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      latency,
    },
  };
}

/**
 * Call Ollama (no native function calling - uses simple chat)
 */
export async function callOllama(
  config: LlmConfig,
  messages: LlmMessage[]
): Promise<LlmResponse> {
  const startTime = Date.now();
  const baseUrl = config.baseUrl;

  if (!baseUrl) {
    throw new Error('Ollama baseUrl not configured');
  }

  // Convert messages to Ollama format
  const ollamaMessages = messages
    .filter((m) => m.role !== 'tool') // Ollama doesn't support tool messages
    .map((m) => ({
      role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: config.temperature ?? 0.7,
        num_predict: config.maxTokens ?? 2000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const latency = Date.now() - startTime;

  return {
    message: data.message?.content || '',
    toolCalls: undefined, // Ollama doesn't support function calling
    finishReason: 'stop',
    metadata: {
      model: config.model,
      tokens: {
        prompt: data.prompt_eval_count || 0,
        completion: data.eval_count || 0,
        total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      latency,
    },
  };
}

/**
 * Universal LLM caller that routes to the appropriate provider
 */
export async function callLlm(
  config: LlmConfig,
  messages: LlmMessage[],
  tools?: McpTool[]
): Promise<LlmResponse> {
  switch (config.provider) {
    case 'openai':
      return callOpenAI(config, messages, tools);
    case 'deepseek':
      return callDeepSeek(config, messages, tools);
    case 'ollama':
      return callOllama(config, messages);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}
