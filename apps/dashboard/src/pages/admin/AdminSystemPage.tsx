import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../api/client';

export function AdminSystemPage() {
  const api = useApi();

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/api/health'),
    refetchInterval: 30000,
  });

  const healthData = healthQuery.data as any;

  return (
    <section className="dashboard-section">
      <h1>System Health</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Monitor system status and services.
      </p>

      {healthQuery.isLoading && <p>Checking health...</p>}
      {healthQuery.error && <p style={{ color: '#dc2626' }}>Error fetching health status</p>}

      {healthData && (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <StatusCard title="API" status={healthData.status} />
          <StatusCard title="Database" status={healthData.database} />
          <StatusCard title="Redis" status={healthData.redis} />
          <StatusCard title="Worker" status={healthData.worker} />
        </div>
      )}

      {healthData && (
        <div style={{ marginTop: '32px' }}>
          <h2>Raw Health Data</h2>
          <pre style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
          }}>
            {JSON.stringify(healthData, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}

function StatusCard({ title, status }: { title: string; status?: string }) {
  const isHealthy = status === 'ok' || status === 'healthy' || status === 'connected';
  const displayStatus = status || 'unknown';
  
  return (
    <div style={{
      padding: '20px',
      background: isHealthy ? '#d1fae5' : '#fee2e2',
      borderRadius: '12px',
    }}>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: isHealthy ? '#065f46' : '#991b1b' }}>
        {isHealthy ? '✅ Healthy' : '❌ ' + displayStatus}
      </div>
    </div>
  );
}
