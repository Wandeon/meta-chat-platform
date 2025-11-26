import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
const CHANNEL_TYPES = ['whatsapp', 'messenger', 'webchat'];
export function ChannelsPage() {
    const api = useApi();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        tenantId: '',
        name: '',
        type: 'webchat',
        config: {},
    });
    const channelsQuery = useQuery({
        queryKey: ['channels'],
        queryFn: () => api.get('/api/channels'),
    });
    const createChannel = useMutation({
        mutationFn: (data) => api.post('/api/channels', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            resetForm();
        },
    });
    const updateChannel = useMutation({
        mutationFn: ({ id, data }) => api.patch(`/api/channels/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            resetForm();
        },
    });
    const deleteChannel = useMutation({
        mutationFn: (id) => api.delete(`/api/channels/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
    });
    const toggleChannelStatus = useMutation({
        mutationFn: ({ id, active }) => api.patch(`/api/channels/${id}`, { active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
    });
    const resetForm = () => {
        setForm({ tenantId: '', name: '', type: 'webchat', config: {} });
        setEditingId(null);
        setIsCreating(false);
    };
    const startEdit = (channel) => {
        setForm({
            tenantId: channel.tenantId,
            name: channel.name,
            type: channel.type,
            config: channel.config || {},
        });
        setEditingId(channel.id);
        setIsCreating(true);
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        const payload = {
            type: form.type,
            name: form.name,
            config: form.config,
        };
        if (editingId) {
            updateChannel.mutate({ id: editingId, data: payload });
        }
        else {
            createChannel.mutate({ ...payload, tenantId: form.tenantId });
        }
    };
    const handleDelete = (id, name) => {
        if (confirm(`Are you sure you want to delete channel "${name}"?`)) {
            deleteChannel.mutate(id);
        }
    };
    const updateConfig = (key, value) => {
        setForm((prev) => ({
            ...prev,
            config: { ...prev.config, [key]: value },
        }));
    };
    return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("h1", { children: "Channels" }), _jsx("p", { style: { margin: '8px 0 0 0', color: '#64748b' }, children: "Configure messaging channels (WhatsApp, Messenger, WebChat)" })] }), !isCreating && (_jsx("button", { onClick: () => setIsCreating(true), className: "primary-button", children: "+ Create Channel" }))] }), isCreating && (_jsxs("div", { style: {
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                }, children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px' }, children: editingId ? 'Edit Channel' : 'Create New Channel' }), _jsxs("form", { className: "form-grid", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Tenant", _jsx(TenantSelector, { value: form.tenantId, onChange: (tenantId) => setForm((prev) => ({ ...prev, tenantId })), required: !editingId, placeholder: "Select tenant" })] }), _jsxs("label", { children: ["Name", _jsx("input", { value: form.name, onChange: (e) => setForm((prev) => ({ ...prev, name: e.target.value })), placeholder: "Customer Support Chat", required: true })] }), _jsxs("label", { children: ["Channel Type", _jsx("select", { value: form.type, onChange: (e) => setForm((prev) => ({ ...prev, type: e.target.value })), disabled: !!editingId, children: CHANNEL_TYPES.map((type) => (_jsx("option", { value: type, children: type === 'webchat' ? 'Web Chat' : type.charAt(0).toUpperCase() + type.slice(1) }, type))) }), editingId && (_jsx("small", { style: { color: '#64748b' }, children: "Channel type cannot be changed after creation" }))] }), form.type === 'whatsapp' && (_jsxs(_Fragment, { children: [_jsx("label", { style: { gridColumn: '1 / -1' }, children: _jsx("h3", { style: { margin: '16px 0 12px 0', fontSize: '16px', fontWeight: 600 }, children: "WhatsApp Business API Configuration" }) }), _jsxs("label", { children: ["API Key", _jsx("input", { type: "password", value: form.config.apiKey || '', onChange: (e) => updateConfig('apiKey', e.target.value), placeholder: "Your WhatsApp API key" })] }), _jsxs("label", { children: ["API Secret", _jsx("input", { type: "password", value: form.config.apiSecret || '', onChange: (e) => updateConfig('apiSecret', e.target.value), placeholder: "Your WhatsApp API secret" })] }), _jsxs("label", { children: ["Phone Number ID", _jsx("input", { value: form.config.phoneNumberId || '', onChange: (e) => updateConfig('phoneNumberId', e.target.value), placeholder: "1234567890" })] }), _jsxs("label", { children: ["Verify Token", _jsx("input", { value: form.config.verifyToken || '', onChange: (e) => updateConfig('verifyToken', e.target.value), placeholder: "Your webhook verify token" })] })] })), form.type === 'messenger' && (_jsxs(_Fragment, { children: [_jsx("label", { style: { gridColumn: '1 / -1' }, children: _jsx("h3", { style: { margin: '16px 0 12px 0', fontSize: '16px', fontWeight: 600 }, children: "Facebook Messenger Configuration" }) }), _jsxs("label", { children: ["App ID", _jsx("input", { value: form.config.appId || '', onChange: (e) => updateConfig('appId', e.target.value), placeholder: "Your Facebook App ID" })] }), _jsxs("label", { children: ["App Secret", _jsx("input", { type: "password", value: form.config.appSecret || '', onChange: (e) => updateConfig('appSecret', e.target.value), placeholder: "Your Facebook App Secret" })] }), _jsxs("label", { children: ["Page Access Token", _jsx("input", { type: "password", value: form.config.pageAccessToken || '', onChange: (e) => updateConfig('pageAccessToken', e.target.value), placeholder: "Your Page Access Token" })] }), _jsxs("label", { children: ["Verify Token", _jsx("input", { value: form.config.verifyToken || '', onChange: (e) => updateConfig('verifyToken', e.target.value), placeholder: "Your webhook verify token" })] })] })), form.type === 'webchat' && (_jsxs(_Fragment, { children: [_jsx("label", { style: { gridColumn: '1 / -1' }, children: _jsx("h3", { style: { margin: '16px 0 12px 0', fontSize: '16px', fontWeight: 600 }, children: "Web Chat Widget Configuration" }) }), _jsxs("label", { children: ["Widget Color", _jsx("input", { type: "color", value: form.config.widgetColor || '#4f46e5', onChange: (e) => updateConfig('widgetColor', e.target.value) }), _jsx("small", { style: { color: '#64748b' }, children: "Primary color for the chat widget" })] }), _jsxs("label", { children: ["Welcome Message", _jsx("input", { value: form.config.welcomeMessage || '', onChange: (e) => updateConfig('welcomeMessage', e.target.value), placeholder: "Hi! How can I help you today?" }), _jsx("small", { style: { color: '#64748b' }, children: "First message shown to users" })] })] })), _jsxs("div", { style: { gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "submit", disabled: createChannel.isPending || updateChannel.isPending, className: "primary-button", children: editingId ? 'Update Channel' : 'Create Channel' }), _jsx("button", { type: "button", onClick: resetForm, className: "secondary-button", children: "Cancel" })] }), (createChannel.error || updateChannel.error) && (_jsx("div", { style: {
                                    gridColumn: '1 / -1',
                                    background: '#fee2e2',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                }, children: _jsxs("p", { style: { margin: 0, color: '#991b1b', fontSize: '14px' }, children: ["Error: ", createChannel.error?.message || updateChannel.error?.message] }) }))] })] })), channelsQuery.isLoading && _jsx("p", { children: "Loading channels..." }), channelsQuery.error && (_jsxs("p", { style: { color: '#dc2626' }, children: ["Error loading channels: ", channelsQuery.error.message] })), channelsQuery.data && channelsQuery.data.length > 0 && (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Tenant" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: channelsQuery.data.map((channel) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: channel.name }) }), _jsx("td", { children: _jsx("span", { style: {
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            background: channel.type === 'whatsapp' ? '#dcfce7' : channel.type === 'messenger' ? '#dbeafe' : '#f3e8ff',
                                            color: channel.type === 'whatsapp' ? '#166534' : channel.type === 'messenger' ? '#1e40af' : '#6b21a8',
                                        }, children: channel.type === 'webchat' ? 'Web Chat' : channel.type.charAt(0).toUpperCase() + channel.type.slice(1) }) }), _jsx("td", { children: _jsxs("code", { style: { fontSize: '12px' }, children: [channel.tenantId.slice(0, 8), "..."] }) }), _jsx("td", { children: _jsxs("label", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                        }, children: [_jsx("input", { type: "checkbox", checked: channel.active, onChange: (e) => toggleChannelStatus.mutate({ id: channel.id, active: e.target.checked }), style: { width: '16px', height: '16px' } }), _jsx("span", { style: {
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: channel.active ? '#059669' : '#64748b',
                                                }, children: channel.active ? 'Active' : 'Inactive' })] }) }), _jsx("td", { children: new Date(channel.createdAt).toLocaleDateString() }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { onClick: () => startEdit(channel), className: "secondary-button", style: { fontSize: '13px', padding: '6px 12px' }, children: "\u270F\uFE0F Edit" }), _jsx("button", { onClick: () => handleDelete(channel.id, channel.name), disabled: deleteChannel.isPending, style: {
                                                    fontSize: '13px',
                                                    padding: '6px 12px',
                                                    background: '#fee2e2',
                                                    border: '1px solid #ef4444',
                                                    color: '#991b1b',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                }, children: "\uD83D\uDDD1\uFE0F Delete" })] }) })] }, channel.id))) })] })), channelsQuery.data && channelsQuery.data.length === 0 && !isCreating && (_jsxs("div", { style: {
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#64748b',
                }, children: [_jsx("p", { style: { fontSize: '16px', marginBottom: '16px' }, children: "No channels configured yet." }), _jsx("button", { onClick: () => setIsCreating(true), className: "primary-button", children: "Create Your First Channel" })] }))] }));
}
//# sourceMappingURL=ChannelsPage.js.map