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

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/api/tenants'),
  });

  const createTenant = useMutation({
    mutationFn: () => api.post<CreateTenantResponse, CreateTenantRequest>('/api/tenants', form),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['tenants'] });
      const previousTenants = queryClient.getQueryData<Tenant[]>(['tenants']);
      const optimisticTenant: Tenant = {
        id: 'temp-' + Date.now(),
        name: form.name,
        slug: form.slug,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Tenant[]>(['tenants'], (old) =>
        old ? [...old, optimisticTenant] : [optimisticTenant]
      );
      return { previousTenants };
    },
    onError: (err, newTenant, context) => {
      if (context?.previousTenants) {
        queryClient.setQueryData(['tenants'], context.previousTenants);
      }
    },
    onSuccess: (data) => {
      setForm({ name: '', slug: '' });
      setNewApiKey(data.apiKey);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setTimeout(() => setNewApiKey(null), 30000);
    },
  });

  const deleteTenant = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/tenants/${id}`),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['tenants'] });
      const previousTenants = queryClient.getQueryData<Tenant[]>(['tenants']);
      queryClient.setQueryData<Tenant[]>(['tenants'], (old) =>
        old ? old.filter((t) => t.id !== deletedId) : []
      );
      return { previousTenants };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousTenants) {
        queryClient.setQueryData(['tenants'], context.previousTenants);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const toggleTenantStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<Tenant>(`/api/tenants/${id}`, { active }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['tenants'] });
      const previousTenants = queryClient.getQueryData<Tenant[]>(['tenants']);
      queryClient.setQueryData<Tenant[]>(['tenants'], (old) =>
        old ? old.map((t) => t.id === id ? { ...t, active } : t) : []
      );
      return { previousTenants };
    },
    onError: (err, variables, context) => {
      if (context?.previousTenants) {
        queryClient.setQueryData(['tenants'], context.previousTenants);
      }
    },
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
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
            Error loading tenants: {tenantsQuery.error.message}
          </p>
          <button
            onClick={() => tenantsQuery.refetch()}
            className="secondary-button"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Retry
          </button>
        </div>
      )}

      {(createTenant.error || deleteTenant.error) && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
            Error: {createTenant.error?.message || deleteTenant.error?.message}
          </p>
          <button
            onClick={() => {
              createTenant.reset();
              deleteTenant.reset();
            }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: '#fff',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
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
                <tr key={tenant.id} style={{
                  opacity: tenant.id.startsWith('temp-') ? 0.6 : 1,
                }}>
                  <td>
                    <strong>{tenant.name}</strong>
                    {tenant.id.startsWith('temp-') && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#6b7280' }}>
                        (saving...)
                      </span>
                    )}
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
                        disabled={tenant.id.startsWith('temp-')}
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
                        disabled={tenant.id.startsWith('temp-')}
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        ⚙️ Settings
                      </button>
                      <button
                        onClick={() => handleDelete(tenant.id, tenant.name)}
                        disabled={deleteTenant.isPending || tenant.id.startsWith('temp-')}
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
