import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
import type { Webhook, CreateWebhookRequest, UpdateWebhookRequest } from '../api/types';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tenantId: '',
    url: '',
    events: [] as string[],
    headers: {} as Record<string, string>,
    secret: '',
  });
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const webhooksQuery = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get<Webhook[]>('/api/webhooks'),
  });

  const createWebhook = useMutation({
    mutationFn: (data: CreateWebhookRequest) =>
      api.post<Webhook, CreateWebhookRequest>('/api/webhooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      resetForm();
    },
  });

  const updateWebhook = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookRequest }) =>
      api.patch<Webhook, UpdateWebhookRequest>(`/api/webhooks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      resetForm();
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const toggleWebhookStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<Webhook, UpdateWebhookRequest>(`/api/webhooks/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const testWebhook = useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean; message: string }>(`/api/webhooks/${id}/test`, {}),
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

  const startEdit = (webhook: Webhook) => {
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

  const toggleEvent = (eventType: string) => {
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

  const removeHeader = (key: string) => {
    setForm((prev) => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return { ...prev, headers: newHeaders };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      url: form.url,
      events: form.events,
      headers: Object.keys(form.headers).length > 0 ? form.headers : undefined,
      secret: form.secret || undefined,
    };

    if (editingId) {
      updateWebhook.mutate({ id: editingId, data: payload });
    } else {
      createWebhook.mutate({ ...payload, tenantId: form.tenantId } as CreateWebhookRequest);
    }
  };

  const handleDelete = (id: string, url: string) => {
    if (confirm(`Are you sure you want to delete webhook to "${url}"?`)) {
      deleteWebhook.mutate(id);
    }
  };

  const handleTest = (id: string) => {
    testWebhook.mutate(id);
  };

  return (
    <section className="dashboard-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Webhooks</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            Configure webhooks to receive real-time event notifications
          </p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="primary-button">
            + Create Webhook
          </button>
        )}
      </div>

      {testResult && (
        <div style={{
          background: testResult.success ? '#d1fae5' : '#fee2e2',
          border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{
            margin: 0,
            color: testResult.success ? '#065f46' : '#991b1b',
            fontWeight: 500,
          }}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </p>
        </div>
      )}

      {isCreating && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
            {editingId ? 'Edit Webhook' : 'Create New Webhook'}
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

            <label style={{ gridColumn: '1 / -1' }}>
              Webhook URL
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://api.example.com/webhooks/metachat"
                required
              />
              <small style={{ color: '#64748b' }}>
                Events will be sent as POST requests to this URL
              </small>
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Webhook Secret (Optional)
              <input
                type="password"
                value={form.secret}
                onChange={(e) => setForm((prev) => ({ ...prev, secret: e.target.value }))}
                placeholder="Enter a secret for webhook signature validation"
              />
              <small style={{ color: '#64748b' }}>
                Used to sign webhook payloads for security verification
              </small>
            </label>

            <fieldset style={{
              gridColumn: '1 / -1',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <legend style={{ fontWeight: 600, padding: '0 8px' }}>Subscribed Events</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                {EVENT_TYPES.map((eventType) => (
                  <label
                    key={eventType}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      background: form.events.includes(eventType) ? '#eff6ff' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(eventType)}
                      onChange={() => toggleEvent(eventType)}
                    />
                    <span style={{ fontSize: '14px' }}>{eventType}</span>
                  </label>
                ))}
              </div>
              {form.events.length === 0 && (
                <p style={{ margin: '12px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
                  Select at least one event to subscribe to
                </p>
              )}
            </fieldset>

            <fieldset style={{
              gridColumn: '1 / -1',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <legend style={{ fontWeight: 600, padding: '0 8px' }}>Custom Headers (Optional)</legend>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  placeholder="Header name (e.g., Authorization)"
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  placeholder="Header value"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addHeader}
                  className="secondary-button"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  + Add Header
                </button>
              </div>
              {Object.entries(form.headers).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(form.headers).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f1f5f9',
                        padding: '8px 12px',
                        borderRadius: '6px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                        <strong>{key}:</strong> {value}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeHeader(key)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '0 4px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="submit"
                disabled={createWebhook.isPending || updateWebhook.isPending || form.events.length === 0}
                className="primary-button"
              >
                {editingId ? 'Update Webhook' : 'Create Webhook'}
              </button>
              <button type="button" onClick={resetForm} className="secondary-button">
                Cancel
              </button>
            </div>

            {(createWebhook.error || updateWebhook.error) && (
              <div style={{
                gridColumn: '1 / -1',
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
              }}>
                <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                  Error: {createWebhook.error?.message || updateWebhook.error?.message}
                </p>
              </div>
            )}
          </form>
        </div>
      )}

      {webhooksQuery.isLoading && <p>Loading webhooks...</p>}
      {webhooksQuery.error && (
        <p style={{ color: '#dc2626' }}>
          Error loading webhooks: {webhooksQuery.error.message}
        </p>
      )}

      {webhooksQuery.data && webhooksQuery.data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Tenant</th>
              <th>Events</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {webhooksQuery.data.map((webhook) => (
              <tr key={webhook.id}>
                <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <code style={{ fontSize: '12px' }}>{webhook.url}</code>
                </td>
                <td>
                  <code style={{ fontSize: '12px' }}>{webhook.tenantId.slice(0, 8)}...</code>
                </td>
                <td>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}
                  </span>
                </td>
                <td>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={webhook.active}
                      onChange={(e) =>
                        toggleWebhookStatus.mutate({ id: webhook.id, active: e.target.checked })
                      }
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: webhook.active ? '#059669' : '#64748b',
                    }}>
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </td>
                <td>{new Date(webhook.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleTest(webhook.id)}
                      disabled={testWebhook.isPending}
                      className="secondary-button"
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      🧪 Test
                    </button>
                    <button
                      onClick={() => startEdit(webhook)}
                      className="secondary-button"
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id, webhook.url)}
                      disabled={deleteWebhook.isPending}
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
            ))}
          </tbody>
        </table>
      )}

      {webhooksQuery.data && webhooksQuery.data.length === 0 && !isCreating && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#64748b',
        }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            No webhooks configured yet.
          </p>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            Create webhooks to receive real-time notifications when events occur in your system.
          </p>
          <button onClick={() => setIsCreating(true)} className="primary-button">
            Create Your First Webhook
          </button>
        </div>
      )}
    </section>
  );
}
