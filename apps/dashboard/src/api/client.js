import { useAuth } from '../routes/AuthProvider';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
/**
 * Make an API request with admin API key authentication
 */
async function request(apiKey, options) {
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
            'Authorization': `Bearer ${apiKey}`, // Use x-admin-key header instead of Bearer token
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    // Handle error responses
    if (!response.ok) {
        let errorMessage;
        try {
            // Clone the response so we can try multiple parse methods if needed
            const clonedResponse = response.clone();
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || `Request failed with status ${response.status}`;
            }
            catch {
                // If JSON parsing fails, try text on the cloned response
                const errorText = await clonedResponse.text();
                errorMessage = errorText || `Request failed with status ${response.status}`;
            }
        }
        catch {
            errorMessage = `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
    }
    // Handle no content responses
    if (response.status === 204) {
        return null;
    }
    // Parse and unwrap API response
    const result = await response.json();
    // Our API wraps responses in { success: true, data: ... }
    if (result.success && 'data' in result) {
        return result.data;
    }
    // Fallback for responses that don't follow the standard format
    return result;
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
        get: (path, query) => request(apiKey, { path, method: 'GET', query }),
        post: (path, body) => request(apiKey, { path, method: 'POST', body }),
        put: (path, body) => request(apiKey, { path, method: 'PUT', body }),
        patch: (path, body) => request(apiKey, { path, method: 'PATCH', body }),
        delete: (path) => request(apiKey, { path, method: 'DELETE' }),
    };
}
//# sourceMappingURL=client.js.map