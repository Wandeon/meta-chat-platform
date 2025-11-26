type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface ApiRequestOptions<TBody = unknown> {
    method?: HttpMethod;
    path: string;
    body?: TBody;
    query?: Record<string, string | number | boolean | undefined>;
}
/**
 * React hook for making authenticated API requests
 */
export declare function useApi(): {
    get: <TResponse>(path: string, query?: Record<string, string | number | boolean | undefined>) => Promise<TResponse>;
    post: <TResponse, TBody = unknown>(path: string, body: TBody) => Promise<TResponse>;
    put: <TResponse, TBody = unknown>(path: string, body: TBody) => Promise<TResponse>;
    patch: <TResponse, TBody = unknown>(path: string, body: TBody) => Promise<TResponse>;
    delete: <TResponse>(path: string) => Promise<TResponse>;
};
export {};
//# sourceMappingURL=client.d.ts.map