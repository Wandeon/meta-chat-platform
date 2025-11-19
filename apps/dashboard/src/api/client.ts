import { useAuth } from '../routes/AuthProvider';
import type { ApiResponse, ApiError } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  path: string;
  body?: TBody;
  query?: Record<string, string | number | boolean | undefined>;
}

/**
 * Make an API request with admin API key authentication
 */
async function request<TResponse, TBody = unknown>(
  apiKey: string,
  options: ApiRequestOptions<TBody>,
): Promise<TResponse> {
  const url = new URL(`${API_BASE}${options.path}`, window.location.origin);

  // Add query parameters
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': apiKey, // Use x-admin-key header instead of Bearer token
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Handle error responses
  if (!response.ok) {
    let errorMessage: string;
    try {
      // Clone the response so we can try multiple parse methods if needed
      const clonedResponse = response.clone();
      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.error?.message || `Request failed with status ${response.status}`;
      } catch {
        // If JSON parsing fails, try text on the cloned response
        const errorText = await clonedResponse.text();
        errorMessage = errorText || `Request failed with status ${response.status}`;
      }
    } catch {
      errorMessage = `Request failed with status ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  // Handle no content responses
  if (response.status === 204) {
    return null as TResponse;
  }

  // Parse and unwrap API response
  const result: ApiResponse<TResponse> = await response.json();

  // Our API wraps responses in { success: true, data: ... }
  if (result.success && 'data' in result) {
    return result.data;
  }

  // Fallback for responses that don't follow the standard format
  return result as unknown as TResponse;
}

/**
 * React hook for making authenticated API requests
 */
export function useApi() {
  const { apiKey } = useAuth();

  if (!apiKey) {
    throw new Error('Missing admin API key');
  }

  return {
    get: <TResponse>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
      request<TResponse>(apiKey, { path, method: 'GET', query }),

    post: <TResponse, TBody = unknown>(path: string, body: TBody) =>
      request<TResponse, TBody>(apiKey, { path, method: 'POST', body }),

    put: <TResponse, TBody = unknown>(path: string, body: TBody) =>
      request<TResponse, TBody>(apiKey, { path, method: 'PUT', body }),

    patch: <TResponse, TBody = unknown>(path: string, body: TBody) =>
      request<TResponse, TBody>(apiKey, { path, method: 'PATCH', body }),

    delete: <TResponse>(path: string) =>
      request<TResponse>(apiKey, { path, method: 'DELETE' }),
  };
}
