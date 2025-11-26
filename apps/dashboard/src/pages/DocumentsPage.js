import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
export function DocumentsPage() {
    const api = useApi();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        tenantId: '',
        name: '',
        source: '',
        metadata: {},
    });
    const [contentInput, setContentInput] = useState('');
    const [fileUpload, setFileUpload] = useState(null);
    const documentsQuery = useQuery({
        queryKey: ['documents'],
        queryFn: () => api.get('/api/documents'),
    });
    const tenantsQuery = useQuery({
        queryKey: ['tenants'],
        queryFn: () => api.get('/api/tenants'),
    });
    const getTenantName = (tenantId) => {
        const tenant = tenantsQuery.data?.find((t) => t.id === tenantId);
        return tenant?.name || tenantId.slice(0, 8) + '...';
    };
    const createDocument = useMutation({
        mutationFn: (data) => api.post('/api/documents', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            resetForm();
        },
    });
    const updateDocument = useMutation({
        mutationFn: ({ id, data }) => api.patch(`/api/documents/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            resetForm();
        },
    });
    const deleteDocument = useMutation({
        mutationFn: (id) => api.delete(`/api/documents/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
    });
    const resetForm = () => {
        setForm({ tenantId: '', name: '', source: '', metadata: {} });
        setContentInput('');
        setFileUpload(null);
        setEditingId(null);
        setIsCreating(false);
    };
    const startEdit = (document) => {
        const docName = document.metadata?.name || document.name || document.filename || '';
        setForm({
            tenantId: document.tenantId,
            name: docName,
            source: document.source || '',
            metadata: document.metadata || {},
        });
        setEditingId(document.id);
        setIsCreating(true);
    };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setFileUpload(file);
        // Read file content
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            setContentInput(content);
        };
        reader.readAsText(file);
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        const payload = {
            name: form.name,
            source: form.source || (fileUpload ? fileUpload.name : 'Manual Upload'),
            metadata: {
                ...form.metadata,
                content: contentInput,
                ...(fileUpload && {
                    fileName: fileUpload.name,
                    fileSize: fileUpload.size,
                    fileType: fileUpload.type,
                }),
            },
        };
        if (editingId) {
            updateDocument.mutate({ id: editingId, data: payload });
        }
        else {
            createDocument.mutate({ ...payload, tenantId: form.tenantId });
        }
    };
    const handleDelete = (id, name) => {
        if (confirm(`Are you sure you want to delete document "${name}"?\n\nThis will remove all chunks and embeddings.`)) {
            deleteDocument.mutate(id);
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'indexed':
                return { bg: '#d1fae5', color: '#065f46' };
            case 'processing':
                return { bg: '#dbeafe', color: '#1e40af' };
            case 'failed':
                return { bg: '#fee2e2', color: '#991b1b' };
            default:
                return { bg: '#f1f5f9', color: '#475569' };
        }
    };
    return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("h1", { children: "Knowledge Base Documents" }), _jsx("p", { style: { margin: '8px 0 0 0', color: '#64748b' }, children: "Upload and manage documents for RAG-powered conversations" })] }), !isCreating && (_jsx("button", { onClick: () => setIsCreating(true), className: "primary-button", children: "+ Add Document" }))] }), isCreating && (_jsxs("div", { style: {
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                }, children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px' }, children: editingId ? 'Edit Document' : 'Add New Document' }), _jsxs("form", { className: "form-grid", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Tenant", _jsx(TenantSelector, { value: form.tenantId, onChange: (tenantId) => setForm((prev) => ({ ...prev, tenantId })), required: !editingId, placeholder: "Select tenant" })] }), _jsxs("label", { children: ["Document Name", _jsx("input", { value: form.name, onChange: (e) => setForm((prev) => ({ ...prev, name: e.target.value })), placeholder: "Product Documentation", required: true })] }), _jsxs("label", { children: ["Source URL (Optional)", _jsx("input", { value: form.source, onChange: (e) => setForm((prev) => ({ ...prev, source: e.target.value })), placeholder: "https://docs.example.com/product" }), _jsx("small", { style: { color: '#64748b' }, children: "Original URL or reference where this document came from" })] }), _jsxs("label", { style: { gridColumn: '1 / -1' }, children: ["Upload File", _jsx("input", { type: "file", accept: ".txt,.md,.json,.csv,.html", onChange: handleFileChange, style: {
                                            padding: '12px',
                                            border: '2px dashed #cbd5e1',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                        } }), _jsx("small", { style: { color: '#64748b' }, children: "Supported formats: .txt, .md, .json, .csv, .html" })] }), _jsxs("label", { style: { gridColumn: '1 / -1' }, children: ["Document Content", _jsx("textarea", { value: contentInput, onChange: (e) => setContentInput(e.target.value), rows: 12, placeholder: "Paste document text here or upload a file above...", required: true, style: { fontFamily: 'monospace', fontSize: '13px' } }), _jsx("small", { style: { color: '#64748b' }, children: "This content will be chunked and embedded for semantic search" })] }), _jsxs("div", { style: { gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '16px' }, children: [_jsx("button", { type: "submit", disabled: createDocument.isPending || updateDocument.isPending, className: "primary-button", children: editingId ? 'Update Document' : 'Add Document' }), _jsx("button", { type: "button", onClick: resetForm, className: "secondary-button", children: "Cancel" })] }), (createDocument.error || updateDocument.error) && (_jsx("div", { style: {
                                    gridColumn: '1 / -1',
                                    background: '#fee2e2',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                }, children: _jsxs("p", { style: { margin: 0, color: '#991b1b', fontSize: '14px' }, children: ["Error: ", createDocument.error?.message || updateDocument.error?.message] }) }))] })] })), documentsQuery.isLoading && _jsx("p", { children: "Loading documents..." }), documentsQuery.error && (_jsxs("p", { style: { color: '#dc2626' }, children: ["Error loading documents: ", documentsQuery.error.message] })), documentsQuery.data && documentsQuery.data.length > 0 && (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Tenant" }), _jsx("th", { children: "Source" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Updated" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: documentsQuery.data.map((document) => {
                            const statusStyle = getStatusColor(document.status);
                            const docName = document.metadata?.name || document.filename || 'Unnamed Document';
                            return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: docName }) }), _jsx("td", { children: _jsx("span", { style: { fontSize: '13px', fontWeight: 500 }, children: getTenantName(document.tenantId) }) }), _jsx("td", { style: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: (document.metadata?.source || document.source || 'Uploaded') }), _jsx("td", { children: _jsx("span", { style: {
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                background: statusStyle.bg,
                                                color: statusStyle.color,
                                            }, children: document.status }) }), _jsx("td", { children: new Date(document.updatedAt).toLocaleDateString() }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { onClick: () => startEdit(document), className: "secondary-button", style: { fontSize: '13px', padding: '6px 12px' }, children: "\u270F\uFE0F Edit" }), _jsx("button", { onClick: () => handleDelete(document.id, docName), disabled: deleteDocument.isPending, style: {
                                                        fontSize: '13px',
                                                        padding: '6px 12px',
                                                        background: '#fee2e2',
                                                        border: '1px solid #ef4444',
                                                        color: '#991b1b',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                    }, children: "\uD83D\uDDD1\uFE0F Delete" })] }) })] }, document.id));
                        }) })] })), documentsQuery.data && documentsQuery.data.length === 0 && !isCreating && (_jsxs("div", { style: {
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: '#64748b',
                }, children: [_jsx("p", { style: { fontSize: '16px', marginBottom: '8px' }, children: "No documents in the knowledge base yet." }), _jsx("p", { style: { fontSize: '14px', marginBottom: '16px' }, children: "Upload documents to enable RAG-powered conversations with context-aware responses." }), _jsx("button", { onClick: () => setIsCreating(true), className: "primary-button", children: "Add Your First Document" })] }))] }));
}
//# sourceMappingURL=DocumentsPage.js.map