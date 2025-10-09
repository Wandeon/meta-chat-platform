import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface Webhook {
  id: string;
  tenantId: string;
  targetUrl: string;
  eventTypes: string[];
  status: 'enabled' | 'disabled';
  createdAt: string;
}

const EVENT_TYPES = ['conversation.created', 'message.sent', 'message.received', 'document.updated'];

export function WebhooksPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ tenantId: string; targetUrl: string; eventTypes: string[] }>(
    { tenantId: '', targetUrl: '', eventTypes: [] },
  );

  const webhooksQuery = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get<Webhook[]>('/webhooks'),
  });

  const createWebhook = useMutation({
    mutationFn: () => api.post<Webhook, typeof form>('/webhooks', form),
    onSuccess: () => {
      setForm({ tenantId: '', targetUrl: '', eventTypes: [] });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const toggleEvent = (eventType: string) => {
    setForm((prev) => {
      const exists = prev.eventTypes.includes(eventType);
      return {
        ...prev,
        eventTypes: exists
          ? prev.eventTypes.filter((value) => value !== eventType)
          : [...prev.eventTypes, eventType],
      };
    });
  };

  return (
    <section className="dashboard-section">
      <h1>Webhooks</h1>
      <p>Deliver real-time system events to downstream services.</p>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          createWebhook.mutate();
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
          Target URL
          <input
            value={form.targetUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, targetUrl: event.target.value }))}
            placeholder="https://api.example.com/webhooks/meta-chat"
            required
          />
        </label>
        <fieldset style={{ border: '1px solid rgba(148,163,184,0.4)', borderRadius: 12, padding: 16 }}>
          <legend>Subscribed events</legend>
          <div style={{ display: 'grid', gap: 8 }}>
            {EVENT_TYPES.map((eventType) => (
              <label key={eventType} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={form.eventTypes.includes(eventType)}
                  onChange={() => toggleEvent(eventType)}
                />
                {eventType}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="primary-button" type="submit" disabled={createWebhook.isPending}>
          Register webhook
        </button>
      </form>

      <table className="data-table" style={{ marginTop: 32 }}>
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Target URL</th>
            <th>Events</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {webhooksQuery.data?.map((webhook) => (
            <tr key={webhook.id}>
              <td>{webhook.tenantId}</td>
              <td>{webhook.targetUrl}</td>
              <td>{webhook.eventTypes.join(', ')}</td>
              <td>{webhook.status}</td>
              <td>{new Date(webhook.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
