import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface Channel {
  id: string;
  tenantId: string;
  type: 'whatsapp' | 'messenger' | 'web';
  name: string;
  status: 'active' | 'error' | 'pending';
  createdAt: string;
}

const CHANNEL_TYPES: Channel['type'][] = ['whatsapp', 'messenger', 'web'];

export function ChannelsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ tenantId: '', name: '', type: 'web' as Channel['type'], credentials: '' });

  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<Channel[]>('/channels'),
  });

  const createChannel = useMutation({
    mutationFn: () =>
      api.post<Channel, typeof form>('/channels', {
        tenantId: form.tenantId,
        name: form.name,
        type: form.type,
        credentials: form.credentials ? JSON.parse(form.credentials) : {},
      }),
    onSuccess: () => {
      setForm({ tenantId: '', name: '', type: 'web', credentials: '' });
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  return (
    <section className="dashboard-section">
      <h1>Channels</h1>
      <p>Configure messaging channels that power tenant conversations.</p>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          createChannel.mutate();
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
          Name
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>
        <label>
          Channel type
          <select
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, type: event.target.value as Channel['type'] }))
            }
          >
            {CHANNEL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          Credentials JSON
          <textarea
            value={form.credentials}
            onChange={(event) => setForm((prev) => ({ ...prev, credentials: event.target.value }))}
            placeholder='{"apiKey":"","apiSecret":""}'
          />
        </label>
        <button className="primary-button" type="submit" disabled={createChannel.isPending}>
          Create channel
        </button>
      </form>

      <table className="data-table" style={{ marginTop: 32 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Tenant</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {channelsQuery.data?.map((channel) => (
            <tr key={channel.id}>
              <td>{channel.name}</td>
              <td>{channel.tenantId}</td>
              <td>{channel.type}</td>
              <td>
                <span className={`status-pill ${channel.status === 'active' ? 'green' : 'red'}`}>
                  {channel.status}
                </span>
              </td>
              <td>{new Date(channel.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
