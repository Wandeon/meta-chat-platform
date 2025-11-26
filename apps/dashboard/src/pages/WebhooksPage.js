import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
const EVENT_TYPES = [
    'conversation.created',
    'conversation.updated',
    'message.sent',
    'message.received',
    'document.indexed',
    'handoff.triggered',
];
export function WebhooksPage() {
    const api = useApi();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        tenantId: '',
        url: '',
        events: [],
        headers: {},
        secret: '',
    });
    const [headerKey, setHeaderKey] = useState('');
    const [headerValue, setHeaderValue] = useState('');
    const [testResult, setTestResult] = useState(null);
    const webhooksQuery = useQuery({
        queryKey: ['webhooks'],
        queryFn: () => api.get('/api/webhooks'),
    });
    const createWebhook = useMutation({
        mutationFn: (data) => api.post('/api/webhooks', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] });
            resetForm();
        },
    });
    const updateWebhook = useMutation({
        mutationFn: ({ id, data }) => api.patch(`/api/webhooks/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] });
            resetForm();
        },
    });
    const deleteWebhook = useMutation({
        mutationFn: (id) => api.delete(`/api/webhooks/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] });
        },
    });
    const toggleWebhookStatus = useMutation({
        mutationFn: ({ id, active }) => api.patch(`/api/webhooks/${id}`, { active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] });
        },
    });
    const testWebhook = useMutation({
        mutationFn: (id) => api.post(`/api/webhooks/${id}/test`, {}),
        onSuccess: (data) => {
            setTestResult(data);
            setTimeout(() => setTestResult(null), 5000);
        },
    });
    const resetForm = () => {
        setForm({ tenantId: '', url: '', events: [], headers: {}, secret: '' });
        setHeaderKey('');
        setHeaderValue('');
        setEditingId(null);
        setIsCreating(false);
    };
    const startEdit = (webhook) => {
        setForm({
            tenantId: webhook.tenantId,
            url: webhook.url,
            events: webhook.events,
            headers: webhook.headers || {},
            secret: '',
        });
        setEditingId(webhook.id);
        setIsCreating(true);
    };
    const toggleEvent = (eventType) => {
        setForm((prev) => {
            const exists = prev.events.includes(eventType);
            return {
                ...prev,
                events: exists
                    ? prev.events.filter((e) => e !== eventType)
                    : [...prev.events, eventType],
            };
        });
    };
    const addHeader = () => {
        if (headerKey && headerValue) {
            setForm((prev) => ({
                ...prev,
                headers: { ...prev.headers, [headerKey]: headerValue },
            }));
            setHeaderKey('');
            setHeaderValue('');
        }
    };
    const removeHeader = (key) => {
        setForm((prev) => {
            const newHeaders = { ...prev.headers };
            delete newHeaders[key];
            return { ...prev, headers: newHeaders };
        });
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        const payload = {
            url: form.url,
            events: form.events,
            headers: Object.keys(form.headers).length > 0 ? form.headers : undefined,
            secret: form.secret || undefined,
        };
        if (editingId) {
            updateWebhook.mutate({ id: editingId, data: payload });
        }
        else {
            createWebhook.mutate({ ...payload, tenantId: form.tenantId });
        }
    };
    const handleDelete = (id, url) => {
        if (confirm(`Are you sure you want to delete webhook to "${url}"?`)) {
            deleteWebhook.mutate(id);
        }
    };
    const handleTest = (id) => {
        testWebhook.mutate(id);
    };
    return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("h1", { children: "Webhooks" }), _jsx("p", { style: { margin: '8px 0 0 0', color: '#64748b' }, children: "Configure webhooks to receive real-time event notifications" })] }), !isCreating && (_jsx("button", { onClick: () => setIsCreating(true), className: "primary-button", children: "+ Create Webhook" }))] }), testResult && (_jsx("div", { style: {
                    background: testResult.success ? '#d1fae5' : '#fee2e2',
                    border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px',
                }, children: _jsxs("p", { style: {
                        margin: 0,
                        color: testResult.success ? '#065f46' : '#991b1b',
                        fontWeight: 500,
                    }, children: [testResult.success ? '✅' : '❌', " ", testResult.message] }) })), isCreating && (_jsxs("div", { style: {
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                }, children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px' }, children: editingId ? 'Edit Webhook' : 'Create New Webhook' }), _jsxs("form", { className: "form-grid", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Tenant", _jsx(TenantSelector, { value: form.tenantId, onChange: (tenantId) => setForm((prev) => ({ ...prev, tenantId })), required: !editingId, placeholder: "Select tenant" })] }), _jsxs("label", { style: { gridColumn: '1 / -1' }, children: ["Webhook URL", _jsx("input", { type: "url", value: form.url, onChange: (e) => setForm((prev) => ({ ...prev, url: e.target.value })), placeholder: "https://api.example.com/webhooks/metachat", required: true }), _jsx("small", { style: { color: '#64748b' }, children: "Events will be sent as POST requests to this URL" })] }), _jsxs("label", { style: { gridColumn: '1 / -1' }, children: ["Webhook Secret (Optional)", _jsx("input", { type: "password", value: form.secret, onChange: (e) => setForm((prev) => ({ ...prev, secret: e.target.value })), placeholder: "Enter a secret for webhook signature validation" }), _jsx("small", { style: { color: '#64748b' }, children: "Used to sign webhook payloads for security verification" })] }), _jsxs("fieldset", { style: {
                                    gridColumn: '1 / -1',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '16px',
                                }, children: [_jsx("legend", { style: { fontWeight: 600, padding: '0 8px' }, children: "Subscribed Events" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }, children: EVENT_TYPES.map((eventType) => (_jsxs("label", { style: {
                                                display: 'flex',
                                                gap: '8px',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                background: form.events.includes(eventType) ? '#eff6ff' : 'transparent',
                                            }, children: [_jsx("input", { type: "checkbox", checked: form.events.includes(eventType), onChange: () => toggleEvent(eventType) }), _jsx("span", { style: { fontSize: '14px' }, children: eventType })] }, eventType))) }), form.events.length === 0 && (_jsx("p", { style: { margin: '12px 0 0 0', color: '#94a3b8', fontSize: '14px' }, children: "Select at least one event to subscribe to" }))] }), _jsxs("fieldset", { style: {
                                    gridColumn: '1 / -1',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '16px',
                                }, children: [_jsx("legend", { style: { fontWeight: 600, padding: '0 8px' }, children: "Custom Headers (Optional)" }), _jsxs("div", { style: { display: 'flex', gap: '8px', marginBottom: '12px' }, children: [_jsx("input", { type: "text", value: headerKey, onChange: (e) => setHeaderKey(e.target.value), placeholder: "Header name (e.g., Authorization)", style: { flex: 1 } }), _jsx("input", { type: "text", value: headerValue, onChange: (e) => setHeaderValue(e.target.value), placeholder: "Header value", style: { flex: 1 } }), _jsx("button", { type: "button", onClick: addHeader, className: "secondary-button", style: { whiteSpace: 'nowrap' }, children: "+ Add Header" })] }), Object.entries(form.headers).length > 0 && (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: Object.entries(form.headers).map(([key, value]) => (_jsxs("div", { style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: '#f1f5f9',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                            }, children: [_jsxs("span", { style: { fontSize: '13px', fontFamily: 'monospace' }, children: [_jsxs("strong", { children: [key, ":"] }), " ", value] }), _jsx("button", { type: "button", onClick: () => removeHeader(key), style: {
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        fontSize: '18px',
                                                        padding: '0 4px',
                                                    }, children: "\u00D7" })] }, key))) }))] }), _jsxs("div", { style: { gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "submit", disabled: createWebhook.isPending || updateWebhook.isPending || form.events.length === 0, className: "primary-button", children: editingId ? 'Update Webhook' : 'Create Webhook' }), _jsx("button", { type: "button", onClick: resetForm, className: "secondary-button", children: "Cancel" })] }), (createWebhook.error || updateWebhook.error) && (_jsx("div", { style: {
                                    gridColumn: '1 / -1',
                                    background: '#fee2e2',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                }, children: _jsxs("p", { style: { margin: 0, color: '#991b1b', fontSize: '14px' }, children: ["Error: ", createWebhook.error?.message || updateWebhook.error?.message] }) }))] })] })), webhooksQuery.isLoading && _jsx("p", { children: "Loading webhooks..." }), webhooksQuery.error && (_jsxs("p", { style: { color: '#dc2626' }, children: ["Error loading webhooks: ", webhooksQuery.error.message] })), webhooksQuery.data && webhooksQuery.data.length > 0 && (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "URL" }), _jsx("th", { children: "Tenant" }), _jsx("th", { children: "Events" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: webhooksQuery.data.map((webhook) => (_jsxs("tr", { children: [_jsx("td", { style: { maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }, children: _jsx("code", { style: { fontSize: '12px' }, children: webhook.url }) }), _jsx("td", { children: _jsxs("code", { style: { fontSize: '12px' }, children: [webhook.tenantId.slice(0, 8), "..."] }) }), _jsx("td", { children: _jsxs("span", { style: { fontSize: '13px', color: '#64748b' }, children: [webhook.events.length, " event", webhook.events.length !== 1 ? 's' : ''] }) }), _jsx("td", { children: _jsxs("label", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                        }, children: [_jsx("input", { type: "checkbox", checked: webhook.active, onChange: (e) => toggleWebhookStatus.mutate({ id: webhook.id, active: e.target.checked }), style: { width: '16px', height: '16px' } }), _jsx("span", { style: {
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: webhook.active ? '#059669' : '#64748b',
                                                }, children: webhook.active ? 'Active' : 'Inactive' })] }) }), _jsx("td", { children: new Date(webhook.createdAt).toLocaleDateString() }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: [_jsx("button", { onClick: () => handleTest(webhook.id), disabled: testWebhook.isPending, className: "secondary-button", style: { fontSize: '13px', padding: '6px 12px' }, children: "\uD83E\uDDEA Test" }), _jsx("button", { onClick: () => startEdit(webhook), className: "secondary-button", style: { fontSize: '13px', padding: '6px 12px' }, children: "\u270F\uFE0F Edit" }), _jsx("button", { onClick: () => handleDelete(webhook.id, webhook.url), disabled: deleteWebhook.isPending, style: {
                                                    fontSize: '13px',
                                                    padding: '6px 12px',
                                                    background: '#fee2e2',
                                                    border: '1px solid #ef4444',
                                                    color: '#991b1b',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                }, children: "\uD83D\uDDD1\uFE0F Delete" })] }) })] }, webhook.id))) })] })), webhooksQuery.data && webhooksQuery.data.length === 0 && !isCreating && (_jsxs("div", { style: {
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#64748b',
                }, children: [_jsx("p", { style: { fontSize: '16px', marginBottom: '8px' }, children: "No webhooks configured yet." }), _jsx("p", { style: { fontSize: '14px', marginBottom: '16px' }, children: "Create webhooks to receive real-time notifications when events occur in your system." }), _jsx("button", { onClick: () => setIsCreating(true), className: "primary-button", children: "Create Your First Webhook" })] }))] }));
}
//# sourceMappingURL=WebhooksPage.js.map