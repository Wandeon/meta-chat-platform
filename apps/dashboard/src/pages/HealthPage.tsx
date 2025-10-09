import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  value: string;
  updatedAt: string;
}

interface SystemVersion {
  apiVersion: string;
  orchestratorVersion: string;
  embeddingsVersion: string;
}

export function HealthPage() {
  const api = useApi();

  const metricsQuery = useQuery({
    queryKey: ['health', 'metrics'],
    queryFn: () => api.get<HealthMetric[]>('/health/metrics'),
  });

  const versionQuery = useQuery({
    queryKey: ['health', 'version'],
    queryFn: () => api.get<SystemVersion>('/health/version'),
  });

  return (
    <section className="dashboard-section">
      <h1>System Health</h1>
      <p>Track the status of real-time services, ingestion pipelines, and AI runtimes.</p>

      <div className="form-grid">
        <div className="dashboard-section" style={{ margin: 0 }}>
          <h2>Platform versions</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <li>API: {versionQuery.data?.apiVersion ?? '–'}</li>
            <li>Orchestrator: {versionQuery.data?.orchestratorVersion ?? '–'}</li>
            <li>Embeddings: {versionQuery.data?.embeddingsVersion ?? '–'}</li>
          </ul>
        </div>
        <div className="dashboard-section" style={{ margin: 0 }}>
          <h2>Latency</h2>
          <p style={{ fontSize: '2.5rem', margin: 0 }}>
            {metricsQuery.data?.find((metric) => metric.name === 'websocket_latency_ms')?.value ?? '–'} ms
          </p>
          <span style={{ color: '#475569' }}>WebSocket round-trip latency</span>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2>Services</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {metricsQuery.data?.map((metric) => (
            <article
              key={metric.name}
              style={{
                background: '#f1f5f9',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{metric.name}</strong>
                <div style={{ color: '#475569', fontSize: '0.9rem' }}>
                  Updated {new Date(metric.updatedAt).toLocaleTimeString()}
                </div>
              </div>
              <span
                className={`status-pill ${
                  metric.status === 'healthy' ? 'green' : metric.status === 'degraded' ? 'red' : 'red'
                }`}
              >
                {metric.status.toUpperCase()} · {metric.value}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
