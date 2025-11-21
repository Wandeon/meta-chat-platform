import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
import type { Document, CreateDocumentRequest, UpdateDocumentRequest } from '../api/types';

export function DocumentsPage() {
  const api = useApi();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantId: '',
    name: '',
    source: '',
    metadata: {} as Record<string, unknown>,
  });
  const [contentInput, setContentInput] = useState('');
  const [fileUpload, setFileUpload] = useState<File | null>(null);

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<Document[]>('/api/documents'),
  });

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<any[]>('/api/tenants'),
  });

  const getTenantName = (tenantId: string) => {
    const tenant = tenantsQuery.data?.find((t: any) => t.id === tenantId);
    return tenant?.name || tenantId.slice(0, 8) + '...';
  };

  const createDocument = useMutation({
    mutationFn: (data: CreateDocumentRequest) =>
      api.post<Document, CreateDocumentRequest>('/api/documents', data),
    onMutate: async (newDocument) => {
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      const previousDocuments = queryClient.getQueryData<Document[]>(['documents']);
      const optimisticDocument: Document = {
        id: 'temp-' + Date.now(),
        tenantId: (newDocument as any).tenantId || '',
        name: newDocument.name,
        source: newDocument.source || '',
        metadata: newDocument.metadata || {},
        status: 'processing',
        filename: '',
        mimeType: '',
        size: 0,
        path: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Document[]>(['documents'], (old) =>
        old ? [...old, optimisticDocument] : [optimisticDocument]
      );
      return { previousDocuments };
    },
    onError: (err, newDocument, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(['documents'], context.previousDocuments);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      resetForm();
    },
  });

  const updateDocument = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentRequest }) =>
      api.patch<Document, UpdateDocumentRequest>(`/api/documents/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      const previousDocuments = queryClient.getQueryData<Document[]>(['documents']);
      queryClient.setQueryData<Document[]>(['documents'], (old) =>
        old ? old.map((d) => d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d) : []
      );
      return { previousDocuments };
    },
    onError: (err, variables, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(['documents'], context.previousDocuments);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      resetForm();
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/documents/${id}`),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      const previousDocuments = queryClient.getQueryData<Document[]>(['documents']);
      queryClient.setQueryData<Document[]>(['documents'], (old) =>
        old ? old.filter((d) => d.id !== deletedId) : []
      );
      return { previousDocuments };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(['documents'], context.previousDocuments);
      }
    },
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

  const startEdit = (document: Document) => {
    const docName = (document.metadata as any)?.name || document.name || document.filename || '';
    setForm({
      tenantId: document.tenantId,
      name: docName,
      source: document.source || '',
      metadata: document.metadata || {},
    });
    setEditingId(document.id);
    setIsCreating(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUpload(file);

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setContentInput(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
    } else {
      createDocument.mutate({ ...payload, tenantId: form.tenantId } as CreateDocumentRequest);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete document "${name}"?\n\nThis will remove all chunks and embeddings.`)) {
      deleteDocument.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
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

  return (
    <section className="dashboard-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Knowledge Base Documents</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            Upload and manage documents for RAG-powered conversations
          </p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="primary-button">
            + Add Document
          </button>
        )}
      </div>

      {isCreating && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
            {editingId ? 'Edit Document' : 'Add New Document'}
          </h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Tenant
              <TenantSelector
                value={form.tenantId}
                onChange={(tenantId) => setForm((prev) => ({ ...prev, tenantId }))}
                required={!editingId}
                placeholder="Select tenant"
              />
            </label>

            <label>
              Document Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Product Documentation"
                required
              />
            </label>

            <label>
              Source URL (Optional)
              <input
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="https://docs.example.com/product"
              />
              <small style={{ color: '#64748b' }}>
                Original URL or reference where this document came from
              </small>
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Upload File
              <input
                type="file"
                accept=".txt,.md,.json,.csv,.html"
                onChange={handleFileChange}
                style={{
                  padding: '12px',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              />
              <small style={{ color: '#64748b' }}>
                Supported formats: .txt, .md, .json, .csv, .html
              </small>
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Document Content
              <textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                rows={12}
                placeholder="Paste document text here or upload a file above..."
                required
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
              />
              <small style={{ color: '#64748b' }}>
                This content will be chunked and embedded for semantic search
              </small>
            </label>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="submit"
                disabled={createDocument.isPending || updateDocument.isPending}
                className="primary-button"
              >
                {editingId ? 'Update Document' : 'Add Document'}
              </button>
              <button type="button" onClick={resetForm} className="secondary-button">
                Cancel
              </button>
            </div>

            {(createDocument.error || updateDocument.error) && (
              <div style={{
                gridColumn: '1 / -1',
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
              }}>
                <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                  Error: {createDocument.error?.message || updateDocument.error?.message}
                </p>
              </div>
            )}
          </form>
        </div>
      )}

      {documentsQuery.isLoading && <p>Loading documents...</p>}
      {documentsQuery.error && (
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
            Error loading documents: {documentsQuery.error.message}
          </p>
          <button
            onClick={() => documentsQuery.refetch()}
            className="secondary-button"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Retry
          </button>
        </div>
      )}

      {(createDocument.error || updateDocument.error || deleteDocument.error) && (
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
            Error: {createDocument.error?.message || updateDocument.error?.message || deleteDocument.error?.message}
          </p>
          <button
            onClick={() => {
              createDocument.reset();
              updateDocument.reset();
              deleteDocument.reset();
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

      {documentsQuery.data && documentsQuery.data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tenant</th>
              <th>Source</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documentsQuery.data.map((document) => {
              const statusStyle = getStatusColor(document.status);
              const docName = (document.metadata as any)?.name || document.filename || 'Unnamed Document';
              return (
                <tr key={document.id}>
                  <td>
                    <strong>{docName}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{getTenantName(document.tenantId)}</span>
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {((document.metadata as any)?.source || document.source || 'Uploaded')}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: statusStyle.bg,
                      color: statusStyle.color,
                    }}>
                      {document.status}
                    </span>
                  </td>
                  <td>{new Date(document.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => startEdit(document)}
                        className="secondary-button"
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(document.id, docName)}
                        disabled={deleteDocument.isPending}
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
              );
            })}
          </tbody>
        </table>
      )}

      {documentsQuery.data && documentsQuery.data.length === 0 && !isCreating && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#64748b',
        }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            No documents in the knowledge base yet.
          </p>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            Upload documents to enable RAG-powered conversations with context-aware responses.
          </p>
          <button onClick={() => setIsCreating(true)} className="primary-button">
            Add Your First Document
          </button>
        </div>
      )}
    </section>
  );
}
