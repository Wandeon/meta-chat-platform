import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export function TenantsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', slug: '' });

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/tenants'),
  });

  const createTenant = useMutation({
    mutationFn: () => api.post<Tenant, typeof form>('/tenants', form),
    onSuccess: () => {
      setForm({ name: '', slug: '' });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  return (
    <section className="dashboard-section">
      <h1>Tenants</h1>
      <p>Provision and manage tenant workspaces.</p>

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
            required
          />
        </label>
        <label>
          Slug
          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={createTenant.isPending}>
          Create tenant
        </button>
      </form>

      <table className="data-table" style={{ marginTop: 32 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {tenantsQuery.data?.map((tenant) => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.slug}</td>
              <td>{new Date(tenant.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
