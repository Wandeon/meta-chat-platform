import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface Document {
  id: string;
  tenantId: string;
  title: string;
  source: string;
  tokens: number;
  updatedAt: string;
}

export function DocumentsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ tenantId: '', title: '', source: '', content: '' });

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<Document[]>('/documents'),
  });

  const upsertDocument = useMutation({
    mutationFn: () => api.post<Document, typeof form>('/documents', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return (
    <section className="dashboard-section">
      <h1>Knowledge Documents</h1>
      <p>Manage retrieval documents powering RAG responses.</p>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          upsertDocument.mutate();
        }}
      >
        <label>
          Tenant ID
          <input
            value={form.tenantId}
            onChange={(event) => setForm((prev) => ({ ...prev, tenantId: event.target.value }))}
            required
          />
        </label>
        <label>
          Title
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
        </label>
        <label>
          Source URL
          <input
            value={form.source}
            onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
            placeholder="https://..."
          />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          Raw content
          <textarea
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            placeholder="Paste document text or JSON payload"
          />
        </label>
        <button className="primary-button" type="submit" disabled={upsertDocument.isPending}>
          Ingest document
        </button>
      </form>

      <table className="data-table" style={{ marginTop: 32 }}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Tenant</th>
            <th>Source</th>
            <th>Tokens</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {documentsQuery.data?.map((document) => (
            <tr key={document.id}>
              <td>{document.title}</td>
              <td>{document.tenantId}</td>
              <td>{document.source || 'Uploaded'}</td>
              <td>{document.tokens}</td>
              <td>{new Date(document.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
