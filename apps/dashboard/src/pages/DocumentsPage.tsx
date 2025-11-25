import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { useAuth } from '../routes/AuthProvider';
import type { Document, CreateDocumentRequest, UpdateDocumentRequest } from '../api/types';

type ViewMode = 'list' | 'upload' | 'write';

// Helper to format dates safely
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  // Check if date is in the future (likely a bug) - show relative time or just "Recently"
  if (date > now) {
    return 'Recently';
  }

  // Check if it's today
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return 'Today';
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // Otherwise format nicely
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { getUser } = useAuth();
  const user = getUser();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', source: '' });
  const [contentInput, setContentInput] = useState('');
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<Document[]>('/api/documents'),
  });

  const createDocument = useMutation({
    mutationFn: (data: CreateDocumentRequest) =>
      api.post<Document, CreateDocumentRequest>('/api/documents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      resetForm();
    },
  });

  const updateDocument = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentRequest }) =>
      api.patch<Document, UpdateDocumentRequest>(`/api/documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      resetForm();
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Retry processing a failed document
  const retryDocument = useMutation({
    mutationFn: (id: string) => api.post<void>(`/api/documents/${id}/retry`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const resetForm = () => {
    setForm({ name: '', source: '' });
    setContentInput('');
    setFileUpload(null);
    setEditingId(null);
    setViewMode('list');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUpload(file);
    setForm((prev) => ({ ...prev, name: prev.name || file.name.replace(/\.[^/.]+$/, '') }));

    const reader = new FileReader();
    reader.onload = (event) => {
      setContentInput(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.tenantId) return;

    const payload = {
      name: form.name,
      source: form.source || (fileUpload ? fileUpload.name : 'Manual Entry'),
      metadata: {
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
      createDocument.mutate({ ...payload, tenantId: user.tenantId } as CreateDocumentRequest);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?\n\nYour chatbot will no longer be able to answer questions about this content.`)) {
      deleteDocument.mutate(id);
    }
  };

  const handleRetry = (id: string) => {
    retryDocument.mutate(id);
  };

  const getStatusBadge = (status: string, doc: Document) => {
    const styles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
      indexed: { bg: '#d1fae5', color: '#065f46', label: 'Ready', icon: '✓' },
      processing: { bg: '#dbeafe', color: '#1e40af', label: 'Processing', icon: '⏳' },
      failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed', icon: '✗' },
    };
    const s = styles[status] || { bg: '#f1f5f9', color: '#475569', label: status, icon: '•' };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: s.bg,
          color: s.color,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {s.icon} {s.label}
        </span>
        {status === 'failed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRetry(doc.id);
            }}
            disabled={retryDocument.isPending}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {retryDocument.isPending ? '...' : 'Retry'}
          </button>
        )}
      </div>
    );
  };

  // Empty state
  if (documentsQuery.data?.length === 0 && viewMode === 'list') {
    return (
      <section className="dashboard-section" style={{ maxWidth: '800px' }}>
        <h1>Knowledge Base</h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>
          Add content to teach your chatbot about your business.
        </p>

        <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>No content yet</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Your chatbot needs information to answer questions. Add documents or paste text to get started.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setViewMode('upload')} className="primary-button">
              Upload Documents
            </button>
            <button onClick={() => setViewMode('write')} className="secondary-button">
              Write or Paste Text
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Upload or Write form
  if (viewMode === 'upload' || viewMode === 'write') {
    return (
      <section className="dashboard-section" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button onClick={resetForm} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>
            ←
          </button>
          <h1 style={{ margin: 0 }}>{viewMode === 'upload' ? 'Upload Documents' : 'Add Text Content'}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
              Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Product FAQ, Pricing Info, Company Policy"
              required
              style={{ width: '100%' }}
            />
            <small style={{ color: '#64748b' }}>Give this content a descriptive name</small>
          </div>

          {viewMode === 'upload' ? (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Choose File *
              </label>
              <input
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx"
                onChange={handleFileChange}
                required={!contentInput}
                style={{
                  width: '100%',
                  padding: '24px',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: '#f8fafc',
                }}
              />
              <small style={{ color: '#64748b' }}>
                Supported: PDF, Word documents, text files (.txt, .md)
              </small>
            </div>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Content *
              </label>
              <textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                rows={15}
                placeholder={'Paste your text content here...\n\nFor example:\n- Product descriptions\n- FAQ answers\n- Company policies\n- Support documentation'}
                required
                style={{ width: '100%', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
              />
            </div>
          )}

          {(createDocument.error || updateDocument.error) && (
            <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#991b1b' }}>
                Error: {createDocument.error?.message || updateDocument.error?.message}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" disabled={createDocument.isPending || updateDocument.isPending} className="primary-button">
              {createDocument.isPending || updateDocument.isPending ? 'Saving...' : (editingId ? 'Update' : 'Add to Knowledge Base')}
            </button>
            <button type="button" onClick={resetForm} className="secondary-button">
              Cancel
            </button>
          </div>
        </form>
      </section>
    );
  }

  // List view
  return (
    <section className="dashboard-section" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Knowledge Base</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            {documentsQuery.data?.length || 0} item{(documentsQuery.data?.length || 0) !== 1 ? 's' : ''} • Your chatbot uses this to answer questions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setViewMode('upload')} className="primary-button">
            Upload
          </button>
          <button onClick={() => setViewMode('write')} className="secondary-button">
            Write
          </button>
        </div>
      </div>

      {documentsQuery.isLoading && <p>Loading...</p>}
      {documentsQuery.error && <p style={{ color: '#dc2626' }}>Error: {documentsQuery.error.message}</p>}

      {documentsQuery.data && documentsQuery.data.length > 0 && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {documentsQuery.data.map((doc) => {
            const metadata = doc.metadata as any || {};
            const docName = metadata.name || doc.filename || 'Unnamed';
            const isExpanded = expandedDoc === doc.id;
            const hasFailed = doc.status === 'failed';
            const errorMessage = metadata.error || metadata.errorMessage;

            return (
              <div
                key={doc.id}
                style={{
                  background: '#fff',
                  border: hasFailed ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {/* Main row */}
                <div
                  onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {docName}
                      <span style={{ color: '#94a3b8', fontSize: '12px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        ▼
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Added {formatDate(doc.createdAt)}
                      {metadata.fileSize && (
                        <span> • {formatFileSize(metadata.fileSize)}</span>
                      )}
                      {metadata.fileType && (
                        <span style={{
                          marginLeft: '8px',
                          padding: '2px 6px',
                          background: '#f1f5f9',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}>
                          {metadata.fileType.split('/').pop()?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {getStatusBadge(doc.status, doc)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id, docName);
                      }}
                      disabled={deleteDocument.isPending}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Source</div>
                        <div style={{ fontSize: '14px' }}>{doc.source || metadata.fileName || 'Manual Entry'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Created</div>
                        <div style={{ fontSize: '14px' }}>{new Date(doc.createdAt).toLocaleString()}</div>
                      </div>
                      {doc.updatedAt && doc.updatedAt !== doc.createdAt && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Last Updated</div>
                          <div style={{ fontSize: '14px' }}>{new Date(doc.updatedAt).toLocaleString()}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Document ID</div>
                        <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>{doc.id}</div>
                      </div>
                    </div>

                    {/* Error details for failed documents */}
                    {hasFailed && errorMessage && (
                      <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600, marginBottom: '4px' }}>
                          Error Details
                        </div>
                        <div style={{ fontSize: '13px', color: '#b91c1c' }}>
                          {errorMessage}
                        </div>
                        <button
                          onClick={() => handleRetry(doc.id)}
                          disabled={retryDocument.isPending}
                          className="primary-button"
                          style={{ marginTop: '12px', fontSize: '13px', padding: '8px 16px' }}
                        >
                          {retryDocument.isPending ? 'Retrying...' : 'Retry Processing'}
                        </button>
                      </div>
                    )}

                    {/* Content preview */}
                    {metadata.content && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Content Preview</div>
                        <div style={{
                          fontSize: '13px',
                          color: '#475569',
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '12px',
                          maxHeight: '150px',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace'
                        }}>
                          {metadata.content.substring(0, 500)}
                          {metadata.content.length > 500 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
