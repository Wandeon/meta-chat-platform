import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import type { Tenant, CreateTenantRequest, CreateTenantResponse } from '../api/types';

export function TenantsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateTenantRequest>({ name: '', slug: '' });
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/api/tenants'),
  });

  const createTenant = useMutation({
    mutationFn: () => api.post<CreateTenantResponse, CreateTenantRequest>('/api/tenants', form),
    onSuccess: (data) => {
      setForm({ name: '', slug: '' });
      setNewApiKey(data.apiKey); // Show the generated API key
      queryClient.invalidateQueries({ queryKey: ['tenants'] });

      // Clear the API key after 30 seconds
      setTimeout(() => setNewApiKey(null), 30000);
    },
  });

  return (
    <section className="dashboard-section">
      <h1>Tenants</h1>
      <p>Provision and manage tenant workspaces.</p>

      {newApiKey && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#92400e' }}>⚠️ Tenant API Key Generated</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#78350f' }}>
            Save this API key securely. It will only be shown once.
          </p>
          <code style={{
            display: 'block',
            background: '#fff',
            padding: '12px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#1e40af',
            wordBreak: 'break-all'
          }}>
            {newApiKey}
          </code>
        </div>
      )}

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          createTenant.mutate();
        }}
      >
        <label>
          Name
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Acme Corporation"
            required
          />
        </label>
        <label>
          Slug
          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="acme-corp"
            pattern="[a-z0-9-]+"
            title="Only lowercase letters, numbers, and hyphens"
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={createTenant.isPending}>
          {createTenant.isPending ? 'Creating...' : 'Create tenant'}
        </button>
      </form>

      {tenantsQuery.isLoading && <p>Loading tenants...</p>}
      {tenantsQuery.error && (
        <p style={{ color: '#dc2626' }}>
          Error loading tenants: {tenantsQuery.error.message}
        </p>
      )}

      {tenantsQuery.data && (
        <table className="data-table" style={{ marginTop: 32 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Active</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {tenantsQuery.data.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                  No tenants yet. Create one above.
                </td>
              </tr>
            ) : (
              tenantsQuery.data.map((tenant) => (
                <tr key={tenant.id}>
                  <td>{tenant.name}</td>
                  <td><code>{tenant.slug}</code></td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: tenant.active ? '#d1fae5' : '#fee2e2',
                      color: tenant.active ? '#065f46' : '#991b1b'
                    }}>
                      {tenant.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(tenant.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
