import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import type { Tenant } from '../api/types';

export function WidgetsIndexPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/api/tenants'),
  });

  const tenants = tenantsQuery.data ?? [];
  const activeTenants = useMemo(() => tenants.filter((tenant) => tenant.active), [tenants]);

  useEffect(() => {
    if (activeTenants.length === 1) {
      navigate(`/tenants/${activeTenants[0].id}/widget`, { replace: true });
    }
  }, [activeTenants, navigate]);

  const handleNavigate = () => {
    const tenantId = selectedTenantId || activeTenants[0]?.id;
    if (tenantId) {
      navigate(`/tenants/${tenantId}/widget`);
    }
  };

  if (tenantsQuery.isLoading) {
    return (
      <section className="dashboard-section">
        <h1>Widget Configurator</h1>
        <p className="muted">Loading tenants...</p>
      </section>
    );
  }

  if (tenantsQuery.isError) {
    return (
      <section className="dashboard-section">
        <h1>Widget Configurator</h1>
        <p className="error">Unable to load tenants. Please try again.</p>
      </section>
    );
  }

  if (tenants.length === 0) {
    return (
      <section className="dashboard-section">
        <h1>Widget Configurator</h1>
        <p className="muted">Create a tenant first to configure the chat widget.</p>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <h1>Widget Configurator</h1>
      <p>Select a tenant to configure the embedded chat widget.</p>

      <div className="card" style={{ maxWidth: 420 }}>
        <label className="form-field">
          <span>Tenant</span>
          <select
            value={selectedTenantId}
            onChange={(event) => setSelectedTenantId(event.target.value)}
          >
            <option value="">{activeTenants.length ? 'Choose a tenant' : 'No active tenants'}</option>
            {activeTenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>

        <button
          className="primary-button"
          type="button"
          disabled={!activeTenants.length}
          onClick={handleNavigate}
        >
          Open configurator
        </button>
      </div>
    </section>
  );
}
