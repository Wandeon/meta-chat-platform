import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
export function McpServersPage() {
    const api = useApi();
    const queryClient = useQueryClient();
    // State for create/edit form
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingServer, setEditingServer] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        command: '',
        args: [],
        requiredEnv: [],
        enabled: true,
    });
    // State for args/requiredEnv inputs
    const [argInput, setArgInput] = useState('');
    const [requiredEnvInput, setRequiredEnvInput] = useState('');
    // Fetch all MCP servers
    const serversQuery = useQuery({
        queryKey: ['mcp-servers'],
        queryFn: () => api.get('/api/mcp-servers'),
    });
    // Create MCP server mutation
    const createServer = useMutation({
        mutationFn: (data) => api.post('/api/mcp-servers', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
            handleCloseForm();
        },
    });
    // Update MCP server mutation
    const updateServer = useMutation({
        mutationFn: ({ id, data }) => api.patch(`/api/mcp-servers/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
            handleCloseForm();
        },
    });
    // Delete MCP server mutation
    const deleteServer = useMutation({
        mutationFn: (id) => api.delete(`/api/mcp-servers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
        },
    });
    // Form handlers
    const handleOpenCreate = () => {
        setEditingServer(null);
        setFormData({
            name: '',
            description: '',
            command: '',
            args: [],
            requiredEnv: [],
            enabled: true,
        });
        setIsFormOpen(true);
    };
    const handleOpenEdit = (server) => {
        setEditingServer(server);
        setFormData({
            name: server.name,
            description: server.description || '',
            command: server.command,
            args: server.args,
            requiredEnv: server.requiredEnv,
            enabled: server.enabled,
        });
        setIsFormOpen(true);
    };
    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingServer(null);
        setArgInput('');
        setRequiredEnvInput('');
    };
    const handleSubmit = () => {
        if (!formData.name.trim() || !formData.command.trim()) {
            alert('Name and command are required');
            return;
        }
        if (editingServer) {
            updateServer.mutate({ id: editingServer.id, data: formData });
        }
        else {
            createServer.mutate(formData);
        }
    };
    const handleDelete = (server) => {
        if (confirm(`Are you sure you want to delete "${server.name}"? This cannot be undone.`)) {
            deleteServer.mutate(server.id);
        }
    };
    // Arg handlers
    const handleAddArg = () => {
        if (argInput.trim()) {
            setFormData((prev) => ({
                ...prev,
                args: [...prev.args, argInput.trim()],
            }));
            setArgInput('');
        }
    };
    const handleRemoveArg = (index) => {
        setFormData((prev) => ({
            ...prev,
            args: prev.args.filter((_, i) => i !== index),
        }));
    };
    // Required env handlers
    const handleAddRequiredEnv = () => {
        if (requiredEnvInput.trim()) {
            setFormData((prev) => ({
                ...prev,
                requiredEnv: [...prev.requiredEnv, requiredEnvInput.trim()],
            }));
            setRequiredEnvInput('');
        }
    };
    const handleRemoveRequiredEnv = (index) => {
        setFormData((prev) => ({
            ...prev,
            requiredEnv: prev.requiredEnv.filter((_, i) => i !== index),
        }));
    };
    if (serversQuery.isLoading) {
        return (_jsx("section", { className: "dashboard-section", children: _jsx("p", { children: "Loading MCP servers..." }) }));
    }
    if (serversQuery.error) {
        return (_jsx("section", { className: "dashboard-section", children: _jsxs("p", { style: { color: '#dc2626' }, children: ["Error loading MCP servers: ", serversQuery.error.message] }) }));
    }
    return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, children: [_jsxs("div", { children: [_jsx("h1", { children: "Global MCP Servers" }), _jsx("p", { style: { margin: '8px 0 0 0', color: '#64748b' }, children: "Configure Model Context Protocol servers for tool integrations" })] }), _jsx("button", { onClick: handleOpenCreate, className: "primary-button", children: "+ Add MCP Server" })] }), _jsx("div", { style: {
                    background: '#eff6ff',
                    border: '1px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px',
                }, children: _jsxs("p", { style: { margin: 0, fontSize: '14px', color: '#1e40af' }, children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "MCP Servers" }), " provide tools like Google Calendar, GitHub, or custom integrations. Add servers here, then enable them per tenant in Tenant Settings."] }) }), serversQuery.data && serversQuery.data.length === 0 ? (_jsxs("div", { style: {
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '32px',
                    textAlign: 'center',
                }, children: [_jsx("p", { style: { margin: '0 0 16px 0', color: '#64748b', fontSize: '16px' }, children: "No MCP servers configured yet" }), _jsx("p", { style: { margin: '0 0 24px 0', color: '#94a3b8', fontSize: '14px' }, children: "Add your first MCP server to enable tool integrations for your chatbots" }), _jsx("button", { onClick: handleOpenCreate, className: "primary-button", children: "+ Add First MCP Server" })] })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: serversQuery.data?.map((server) => (_jsx("div", { style: {
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '20px',
                    }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'start', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }, children: [_jsx("h3", { style: { margin: 0, fontSize: '18px', fontWeight: 600 }, children: server.name }), server.enabled ? (_jsx("span", { style: {
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    background: '#d1fae5',
                                                    color: '#065f46',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                }, children: "ENABLED" })) : (_jsx("span", { style: {
                                                    fontSize: '11px',
                                                    padding: '3px 8px',
                                                    background: '#f1f5f9',
                                                    color: '#475569',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                }, children: "DISABLED" }))] }), server.description && (_jsx("p", { style: { margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }, children: server.description })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }, children: [_jsxs("div", { style: { fontSize: '13px', color: '#475569' }, children: [_jsx("strong", { children: "Command:" }), ' ', _jsx("code", { style: {
                                                            background: '#f1f5f9',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontFamily: 'monospace',
                                                        }, children: server.command })] }), server.args.length > 0 && (_jsxs("div", { style: { fontSize: '13px', color: '#475569' }, children: [_jsx("strong", { children: "Args:" }), ' ', server.args.map((arg, i) => (_jsx("code", { style: {
                                                            background: '#f1f5f9',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontFamily: 'monospace',
                                                            marginRight: '4px',
                                                        }, children: arg }, i)))] })), server.requiredEnv.length > 0 && (_jsxs("div", { style: { fontSize: '13px', color: '#475569' }, children: [_jsx("strong", { children: "Required Environment Variables:" }), ' ', server.requiredEnv.map((envVar, i) => (_jsx("code", { style: {
                                                            background: '#fef3c7',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontFamily: 'monospace',
                                                            marginRight: '4px',
                                                            color: '#92400e',
                                                        }, children: envVar }, i)))] }))] }), _jsxs("p", { style: { margin: '12px 0 0 0', fontSize: '12px', color: '#94a3b8' }, children: ["Created: ", new Date(server.createdAt).toLocaleDateString()] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { onClick: () => handleOpenEdit(server), className: "secondary-button", style: { fontSize: '13px', padding: '6px 12px' }, children: "Edit" }), _jsx("button", { onClick: () => handleDelete(server), disabled: deleteServer.isPending, style: {
                                            background: 'transparent',
                                            border: '1px solid #dc2626',
                                            color: '#dc2626',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }, children: "Delete" })] })] }) }, server.id))) })), isFormOpen && (_jsx("div", { style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }, children: _jsxs("div", { style: {
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '32px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                    }, children: [_jsx("h2", { style: { margin: '0 0 24px 0', fontSize: '20px', fontWeight: 600 }, children: editingServer ? 'Edit MCP Server' : 'Add MCP Server' }), _jsxs("label", { style: { display: 'block', marginBottom: '16px' }, children: [_jsxs("span", { style: { display: 'block', marginBottom: '6px', fontWeight: 500 }, children: ["Name ", _jsx("span", { style: { color: '#dc2626' }, children: "*" })] }), _jsx("input", { type: "text", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), placeholder: "e.g., Google Calendar, GitHub", style: { width: '100%' } })] }), _jsxs("label", { style: { display: 'block', marginBottom: '16px' }, children: [_jsx("span", { style: { display: 'block', marginBottom: '6px', fontWeight: 500 }, children: "Description" }), _jsx("textarea", { value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), placeholder: "Optional description", rows: 2, style: { width: '100%', resize: 'vertical' } })] }), _jsxs("label", { style: { display: 'block', marginBottom: '16px' }, children: [_jsxs("span", { style: { display: 'block', marginBottom: '6px', fontWeight: 500 }, children: ["Command ", _jsx("span", { style: { color: '#dc2626' }, children: "*" })] }), _jsx("input", { type: "text", value: formData.command, onChange: (e) => setFormData({ ...formData, command: e.target.value }), placeholder: "e.g., npx, node, python", style: { width: '100%' } }), _jsx("small", { style: { color: '#64748b', display: 'block', marginTop: '4px' }, children: "The executable to run (e.g., npx, node, python, /path/to/binary)" })] }), _jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("span", { style: { display: 'block', marginBottom: '6px', fontWeight: 500 }, children: "Arguments" }), _jsxs("div", { style: { display: 'flex', gap: '8px', marginBottom: '8px' }, children: [_jsx("input", { type: "text", value: argInput, onChange: (e) => setArgInput(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleAddArg(), placeholder: "e.g., -s, @modelcontextprotocol/server-google-calendar", style: { flex: 1 } }), _jsx("button", { onClick: handleAddArg, className: "secondary-button", children: "Add" })] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: [formData.args.map((arg, index) => (_jsxs("span", { style: {
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: '#e0e7ff',
                                                color: '#3730a3',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontFamily: 'monospace',
                                            }, children: [arg, _jsx("button", { onClick: () => handleRemoveArg(index), style: {
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#3730a3',
                                                        cursor: 'pointer',
                                                        padding: '0 4px',
                                                        fontSize: '16px',
                                                        lineHeight: 1,
                                                    }, children: "\u00D7" })] }, index))), formData.args.length === 0 && (_jsx("p", { style: { color: '#94a3b8', fontSize: '13px', margin: 0 }, children: "No arguments. Add optional arguments above." }))] })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("span", { style: { display: 'block', marginBottom: '6px', fontWeight: 500 }, children: "Required Environment Variables" }), _jsx("p", { style: { fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }, children: "List the names of environment variables that tenants must provide (e.g., API keys, tokens). Tenants will enter the actual values in their settings." }), _jsxs("div", { style: { display: 'flex', gap: '8px', marginBottom: '8px' }, children: [_jsx("input", { type: "text", value: requiredEnvInput, onChange: (e) => setRequiredEnvInput(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleAddRequiredEnv(), placeholder: "e.g., GOOGLE_CLIENT_ID, GITHUB_TOKEN", style: { flex: 1 } }), _jsx("button", { onClick: handleAddRequiredEnv, className: "secondary-button", children: "Add" })] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: [formData.requiredEnv.map((envVar, index) => (_jsxs("span", { style: {
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: '#fef3c7',
                                                color: '#92400e',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                fontFamily: 'monospace',
                                                fontWeight: 500,
                                            }, children: [envVar, _jsx("button", { onClick: () => handleRemoveRequiredEnv(index), style: {
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#92400e',
                                                        cursor: 'pointer',
                                                        padding: '0 4px',
                                                        fontSize: '16px',
                                                        lineHeight: 1,
                                                    }, children: "\u00D7" })] }, index))), formData.requiredEnv.length === 0 && (_jsx("p", { style: { color: '#94a3b8', fontSize: '13px', margin: 0 }, children: "No required environment variables. Tenants won't need to provide credentials." }))] })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: formData.enabled, onChange: (e) => setFormData({ ...formData, enabled: e.target.checked }) }), _jsx("span", { children: "Enabled (available for tenants to activate)" })] }), (createServer.error || updateServer.error) && (_jsx("div", { style: {
                                background: '#fee2e2',
                                border: '1px solid #ef4444',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '16px',
                            }, children: _jsxs("p", { style: { margin: 0, color: '#991b1b', fontSize: '14px' }, children: ["Error: ", (createServer.error || updateServer.error)?.message] }) })), _jsxs("div", { style: { display: 'flex', gap: '12px', justifyContent: 'flex-end' }, children: [_jsx("button", { onClick: handleCloseForm, className: "secondary-button", disabled: createServer.isPending || updateServer.isPending, children: "Cancel" }), _jsx("button", { onClick: handleSubmit, className: "primary-button", disabled: createServer.isPending || updateServer.isPending, children: createServer.isPending || updateServer.isPending
                                        ? 'Saving...'
                                        : editingServer
                                            ? 'Update Server'
                                            : 'Create Server' })] })] }) }))] }));
}
//# sourceMappingURL=McpServersPage.js.map