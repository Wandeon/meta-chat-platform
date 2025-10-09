import { useAuth } from '../routes/AuthProvider';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/admin';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  path: string;
  body?: TBody;
  query?: Record<string, string | number | undefined>;
}

async function request<TResponse, TBody = unknown>(
  token: string,
  options: ApiRequestOptions<TBody>,
): Promise<TResponse> {
  const url = new URL(`${API_BASE}${options.path}`, window.location.origin);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }
  const response = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return null as TResponse;
  }
  return (await response.json()) as TResponse;
}

export function useApi() {
  const { token } = useAuth();
  if (!token) {
    throw new Error('Missing admin token');
  }
  return {
    get: <TResponse>(path: string, query?: Record<string, string | number | undefined>) =>
      request<TResponse>(token, { path, method: 'GET', query }),
    post: <TResponse, TBody>(path: string, body: TBody) =>
      request<TResponse, TBody>(token, { path, method: 'POST', body }),
    put: <TResponse, TBody>(path: string, body: TBody) =>
      request<TResponse, TBody>(token, { path, method: 'PUT', body }),
    patch: <TResponse, TBody>(path: string, body: TBody) =>
      request<TResponse, TBody>(token, { path, method: 'PATCH', body }),
    delete: <TResponse>(path: string) => request<TResponse>(token, { path, method: 'DELETE' }),
  };
}
