import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
export function HealthPage() {
    const api = useApi();
    const metricsQuery = useQuery({
        queryKey: ['health', 'metrics'],
        queryFn: () => api.get('/health/metrics'),
    });
    const versionQuery = useQuery({
        queryKey: ['health', 'version'],
        queryFn: () => api.get('/health/version'),
    });
    return (_jsxs("section", { className: "dashboard-section", children: [_jsx("h1", { children: "System Health" }), _jsx("p", { children: "Track the status of real-time services, ingestion pipelines, and AI runtimes." }), _jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "dashboard-section", style: { margin: 0 }, children: [_jsx("h2", { children: "Platform versions" }), _jsxs("ul", { style: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }, children: [_jsxs("li", { children: ["API: ", versionQuery.data?.apiVersion ?? '–'] }), _jsxs("li", { children: ["Orchestrator: ", versionQuery.data?.orchestratorVersion ?? '–'] }), _jsxs("li", { children: ["Embeddings: ", versionQuery.data?.embeddingsVersion ?? '–'] })] })] }), _jsxs("div", { className: "dashboard-section", style: { margin: 0 }, children: [_jsx("h2", { children: "Latency" }), _jsxs("p", { style: { fontSize: '2.5rem', margin: 0 }, children: [metricsQuery.data?.find((metric) => metric.name === 'websocket_latency_ms')?.value ?? '–', " ms"] }), _jsx("span", { style: { color: '#475569' }, children: "WebSocket round-trip latency" })] })] }), _jsxs("div", { style: { marginTop: 32 }, children: [_jsx("h2", { children: "Services" }), _jsx("div", { style: { display: 'grid', gap: 12 }, children: metricsQuery.data?.map((metric) => (_jsxs("article", { style: {
                                background: '#f1f5f9',
                                borderRadius: 12,
                                padding: '12px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }, children: [_jsxs("div", { children: [_jsx("strong", { children: metric.name }), _jsxs("div", { style: { color: '#475569', fontSize: '0.9rem' }, children: ["Updated ", new Date(metric.updatedAt).toLocaleTimeString()] })] }), _jsxs("span", { className: `status-pill ${metric.status === 'healthy' ? 'green' : metric.status === 'degraded' ? 'red' : 'red'}`, children: [metric.status.toUpperCase(), " \u00B7 ", metric.value] })] }, metric.name))) })] })] }));
}
//# sourceMappingURL=HealthPage.js.map