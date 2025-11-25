import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../api/client';

interface TenantWithUser {
  id: string;
  name: string;
  subscriptionStatus: string;
  createdAt: string;
  users: { email: string; name: string }[];
  settings: { llm?: { provider?: string; model?: string } };
}

export function AdminClientsPage() {
  const api = useApi();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => api.get<TenantWithUser[]>('/api/admin/tenants'),
  });

  const updateTenant = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/api/admin/tenants/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }),
  });

  return (
    <section className="dashboard-section">
      <h1>Clients</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Manage all client accounts and their AI model assignments.
      </p>

      {tenantsQuery.isLoading && <p>Loading clients...</p>}
      {tenantsQuery.error && <p style={{ color: '#dc2626' }}>Error loading clients</p>}

      {tenantsQuery.data && tenantsQuery.data.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Owner</th>
              <th>Plan</th>
              <th>Model</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenantsQuery.data.map((tenant) => (
              <tr key={tenant.id}>
                <td><strong>{tenant.name}</strong></td>
                <td>{tenant.users?.[0]?.email || 'N/A'}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: tenant.subscriptionStatus === 'active' ? '#d1fae5' : '#f1f5f9',
                    color: tenant.subscriptionStatus === 'active' ? '#065f46' : '#64748b',
                  }}>
                    {tenant.subscriptionStatus}
                  </span>
                </td>
                <td>{tenant.settings?.llm?.model || 'ollama/default'}</td>
                <td>{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="secondary-button" style={{ fontSize: '13px', padding: '6px 12px' }} disabled>
                    Configure
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : tenantsQuery.data && (
        <div style={{ textAlign: 'center', padding: '48px', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h2 style={{ margin: '0 0 8px 0' }}>No clients yet</h2>
          <p style={{ color: '#64748b' }}>Clients will appear here when they sign up.</p>
        </div>
      )}
    </section>
  );
}
