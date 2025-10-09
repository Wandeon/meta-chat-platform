import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import type { Tenant } from '../api/types';

interface TenantSelectorProps {
  value: string;
  onChange: (tenantId: string) => void;
  required?: boolean;
  placeholder?: string;
}

export function TenantSelector({ value, onChange, required = false, placeholder = 'Select a tenant' }: TenantSelectorProps) {
  const api = useApi();

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<Tenant[]>('/api/tenants'),
  });

  if (tenantsQuery.isLoading) {
    return (
      <select disabled>
        <option>Loading tenants...</option>
      </select>
    );
  }

  if (tenantsQuery.error) {
    return (
      <select disabled>
        <option>Error loading tenants</option>
      </select>
    );
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">{placeholder}</option>
      {tenantsQuery.data?.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name} ({tenant.slug})
        </option>
      ))}
    </select>
  );
}
