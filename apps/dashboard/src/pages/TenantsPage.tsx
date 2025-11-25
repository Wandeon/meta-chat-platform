import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import type { Tenant, CreateTenantRequest, CreateTenantResponse } from '../api/types';

export function TenantsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateTenantRequest>({ name: '', slug: '' });
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/api/tenants'),
  });

  const createTenant = useMutation({
    mutationFn: () => api.post<CreateTenantResponse, CreateTenantRequest>('/api/tenants', form),
    onSuccess: (data) => {
      const tenantName = form.name;
      setForm({ name: '', slug: '' });
      setNewApiKey(data.apiKey); // Show the generated API key
      setSuccessMessage(`Tenant "${tenantName}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });

      // Clear the API key after 30 seconds
      setTimeout(() => setNewApiKey(null), 30000);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  const deleteTenant = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setSuccessMessage('Tenant deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  const toggleTenantStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<Tenant>(`/api/tenants/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete tenant "${name}"?\n\nThis will also delete all associated channels, documents, conversations, and webhooks.`)) {
      deleteTenant.mutate(id);
    }
  };

  return (
    <section className="dashboard-section">
      <h1>Tenants</h1>
      <p>Provision and manage tenant workspaces.</p>

      {successMessage && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>✓</span>
          <p style={{ margin: 0, color: '#065f46', fontWeight: 500 }}>
            {successMessage}
          </p>
        </div>
      )}

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

      {createTenant.error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
            Error creating tenant: {createTenant.error.message}
          </p>
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
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenantsQuery.data.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                  No tenants yet. Create one above.
                </td>
              </tr>
            ) : (
              tenantsQuery.data.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <strong>{tenant.name}</strong>
                  </td>
                  <td><code>{tenant.slug}</code></td>
                  <td>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={tenant.active}
                        onChange={(e) =>
                          toggleTenantStatus.mutate({ id: tenant.id, active: e.target.checked })
                        }
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: tenant.active ? '#059669' : '#64748b',
                      }}>
                        {tenant.active ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </td>
                  <td>{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/tenants/${tenant.id}/settings`)}
                        className="secondary-button"
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        ⚙️ Settings
                      </button>
                      <button
                        onClick={() => handleDelete(tenant.id, tenant.name)}
                        disabled={deleteTenant.isPending}
                        style={{
                          fontSize: '13px',
                          padding: '6px 12px',
                          background: '#fee2e2',
                          border: '1px solid #ef4444',
                          color: '#991b1b',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
