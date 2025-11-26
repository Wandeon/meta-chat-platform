import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
export function TenantSelector({ value, onChange, required = false, placeholder = 'Select a tenant' }) {
    const api = useApi();
    const tenantsQuery = useQuery({
        queryKey: ['tenants'],
        queryFn: () => api.get('/api/tenants'),
    });
    if (tenantsQuery.isLoading) {
        return (_jsx("select", { disabled: true, children: _jsx("option", { children: "Loading tenants..." }) }));
    }
    if (tenantsQuery.error) {
        return (_jsx("select", { disabled: true, children: _jsx("option", { children: "Error loading tenants" }) }));
    }
    return (_jsxs("select", { value: value, onChange: (e) => onChange(e.target.value), required: required, children: [_jsx("option", { value: "", children: placeholder }), tenantsQuery.data?.map((tenant) => (_jsxs("option", { value: tenant.id, children: [tenant.name, " (", tenant.slug, ")"] }, tenant.id)))] }));
}
//# sourceMappingURL=TenantSelector.js.map