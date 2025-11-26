import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
export function TenantsPage() {
    const api = useApi();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ name: '', slug: '' });
    const [newApiKey, setNewApiKey] = useState(null);
    const tenantsQuery = useQuery({
        queryKey: ['tenants'],
        queryFn: () => api.get('/api/tenants'),
    });
    const createTenant = useMutation({
        mutationFn: () => api.post('/api/tenants', form),
        onSuccess: (data) => {
            setForm({ name: '', slug: '' });
            setNewApiKey(data.apiKey); // Show the generated API key
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            // Clear the API key after 30 seconds
            setTimeout(() => setNewApiKey(null), 30000);
        },
    });
    const deleteTenant = useMutation({
        mutationFn: (id) => api.delete(`/api/tenants/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
        },
    });
    const toggleTenantStatus = useMutation({
        mutationFn: ({ id, active }) => api.patch(`/api/tenants/${id}`, { active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
        },
    });
    const handleDelete = (id, name) => {
        if (confirm(`Are you sure you want to delete tenant "${name}"?\n\nThis will also delete all associated channels, documents, conversations, and webhooks.`)) {
            deleteTenant.mutate(id);
        }
    };
    return (_jsxs("section", { className: "dashboard-section", children: [_jsx("h1", { children: "Tenants" }), _jsx("p", { children: "Provision and manage tenant workspaces." }), newApiKey && (_jsxs("div", { style: {
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px'
                }, children: [_jsx("h3", { style: { margin: '0 0 8px 0', color: '#92400e' }, children: "\u26A0\uFE0F Tenant API Key Generated" }), _jsx("p", { style: { margin: '0 0 12px 0', fontSize: '14px', color: '#78350f' }, children: "Save this API key securely. It will only be shown once." }), _jsx("code", { style: {
                            display: 'block',
                            background: '#fff',
                            padding: '12px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            color: '#1e40af',
                            wordBreak: 'break-all'
                        }, children: newApiKey })] })), _jsxs("form", { className: "form-grid", onSubmit: (event) => {
                    event.preventDefault();
                    createTenant.mutate();
                }, children: [_jsxs("label", { children: ["Name", _jsx("input", { value: form.name, onChange: (event) => setForm((prev) => ({ ...prev, name: event.target.value })), placeholder: "Acme Corporation", required: true })] }), _jsxs("label", { children: ["Slug", _jsx("input", { value: form.slug, onChange: (event) => setForm((prev) => ({ ...prev, slug: event.target.value })), placeholder: "acme-corp", pattern: "[a-z0-9-]+", title: "Only lowercase letters, numbers, and hyphens", required: true })] }), _jsx("button", { className: "primary-button", type: "submit", disabled: createTenant.isPending, children: createTenant.isPending ? 'Creating...' : 'Create tenant' })] }), tenantsQuery.isLoading && _jsx("p", { children: "Loading tenants..." }), tenantsQuery.error && (_jsxs("p", { style: { color: '#dc2626' }, children: ["Error loading tenants: ", tenantsQuery.error.message] })), tenantsQuery.data && (_jsxs("table", { className: "data-table", style: { marginTop: 32 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Slug" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: tenantsQuery.data.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, style: { textAlign: 'center', color: '#64748b' }, children: "No tenants yet. Create one above." }) })) : (tenantsQuery.data.map((tenant) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: tenant.name }) }), _jsx("td", { children: _jsx("code", { children: tenant.slug }) }), _jsx("td", { children: _jsxs("label", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                        }, children: [_jsx("input", { type: "checkbox", checked: tenant.active, onChange: (e) => toggleTenantStatus.mutate({ id: tenant.id, active: e.target.checked }), style: { width: '16px', height: '16px' } }), _jsx("span", { style: {
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: tenant.active ? '#059669' : '#64748b',
                                                }, children: tenant.active ? 'Active' : 'Inactive' })] }) }), _jsx("td", { children: new Date(tenant.createdAt).toLocaleDateString() }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { onClick: () => navigate(`/tenants/${tenant.id}/settings`), className: "secondary-button", style: { fontSize: '13px', padding: '6px 12px' }, children: "\u2699\uFE0F Settings" }), _jsx("button", { onClick: () => handleDelete(tenant.id, tenant.name), disabled: deleteTenant.isPending, style: {
                                                    fontSize: '13px',
                                                    padding: '6px 12px',
                                                    background: '#fee2e2',
                                                    border: '1px solid #ef4444',
                                                    color: '#991b1b',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                }, children: "\uD83D\uDDD1\uFE0F Delete" })] }) })] }, tenant.id)))) })] }))] }));
}
//# sourceMappingURL=TenantsPage.js.map