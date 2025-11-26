import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
import type { Channel, CreateChannelRequest, UpdateChannelRequest } from '../api/types';

interface ChannelFormData {
  tenantId: string;
  name: string;
  type: 'whatsapp' | 'messenger' | 'webchat';
  config: {
    apiKey?: string;
    apiSecret?: string;
    phoneNumberId?: string;
    verifyToken?: string;
    appId?: string;
    appSecret?: string;
    pageAccessToken?: string;
    widgetColor?: string;
    welcomeMessage?: string;
  };
}

const CHANNEL_TYPES = ['whatsapp', 'messenger', 'webchat'] as const;

export function ChannelsPage() {
  const api = useApi();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelFormData>({
    tenantId: '',
    name: '',
    type: 'webchat',
    config: {},
  });

  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<Channel[]>('/api/channels'),
  });

  const createChannel = useMutation({
    mutationFn: (data: CreateChannelRequest) =>
      api.post<Channel, CreateChannelRequest>('/api/channels', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      resetForm();
    },
  });

  const updateChannel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChannelRequest }) =>
      api.patch<Channel, UpdateChannelRequest>(`/api/channels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      resetForm();
    },
  });

  const deleteChannel = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/channels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const toggleChannelStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<Channel, UpdateChannelRequest>(`/api/channels/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const resetForm = () => {
    setForm({ tenantId: '', name: '', type: 'webchat', config: {} });
    setEditingId(null);
    setIsCreating(false);
  };

  const startEdit = (channel: Channel) => {
    setForm({
      tenantId: channel.tenantId,
      name: channel.name,
      type: channel.type,
      config: (channel.config as ChannelFormData['config']) || {},
    });
    setEditingId(channel.id);
    setIsCreating(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      type: form.type,
      name: form.name,
      config: form.config,
    };

    if (editingId) {
      updateChannel.mutate({ id: editingId, data: payload });
    } else {
      createChannel.mutate({ ...payload, tenantId: form.tenantId } as CreateChannelRequest);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete channel "${name}"?`)) {
      deleteChannel.mutate(id);
    }
  };

  const updateConfig = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  };

  return (
    <section className="dashboard-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Channels</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            Configure messaging channels (WhatsApp, Messenger, WebChat)
          </p>
        </div>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="primary-button">
            + Create Channel
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
            {editingId ? 'Edit Channel' : 'Create New Channel'}
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
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Customer Support Chat"
                required
              />
            </label>

            <label>
              Channel Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value as ChannelFormData['type'] }))
                }
                disabled={!!editingId}
              >
                {CHANNEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === 'webchat' ? 'Web Chat' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              {editingId && (
                <small style={{ color: '#64748b' }}>
                  Channel type cannot be changed after creation
                </small>
              )}
            </label>

            {/* WhatsApp Configuration */}
            {form.type === 'whatsapp' && (
              <>
                <label style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ margin: '16px 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
                    WhatsApp Business API Configuration
                  </h3>
                </label>
                <label>
                  API Key
                  <input
                    type="password"
                    value={form.config.apiKey || ''}
                    onChange={(e) => updateConfig('apiKey', e.target.value)}
                    placeholder="Your WhatsApp API key"
                  />
                </label>
                <label>
                  API Secret
                  <input
                    type="password"
                    value={form.config.apiSecret || ''}
                    onChange={(e) => updateConfig('apiSecret', e.target.value)}
                    placeholder="Your WhatsApp API secret"
                  />
                </label>
                <label>
                  Phone Number ID
                  <input
                    value={form.config.phoneNumberId || ''}
                    onChange={(e) => updateConfig('phoneNumberId', e.target.value)}
                    placeholder="1234567890"
                  />
                </label>
                <label>
                  Verify Token
                  <input
                    value={form.config.verifyToken || ''}
                    onChange={(e) => updateConfig('verifyToken', e.target.value)}
                    placeholder="Your webhook verify token"
                  />
                </label>
              </>
            )}

            {/* Messenger Configuration */}
            {form.type === 'messenger' && (
              <>
                <label style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ margin: '16px 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
                    Facebook Messenger Configuration
                  </h3>
                </label>
                <label>
                  App ID
                  <input
                    value={form.config.appId || ''}
                    onChange={(e) => updateConfig('appId', e.target.value)}
                    placeholder="Your Facebook App ID"
                  />
                </label>
                <label>
                  App Secret
                  <input
                    type="password"
                    value={form.config.appSecret || ''}
                    onChange={(e) => updateConfig('appSecret', e.target.value)}
                    placeholder="Your Facebook App Secret"
                  />
                </label>
                <label>
                  Page Access Token
                  <input
                    type="password"
                    value={form.config.pageAccessToken || ''}
                    onChange={(e) => updateConfig('pageAccessToken', e.target.value)}
                    placeholder="Your Page Access Token"
                  />
                </label>
                <label>
                  Verify Token
                  <input
                    value={form.config.verifyToken || ''}
                    onChange={(e) => updateConfig('verifyToken', e.target.value)}
                    placeholder="Your webhook verify token"
                  />
                </label>
              </>
            )}

            {/* WebChat Configuration */}
            {form.type === 'webchat' && (
              <>
                <label style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ margin: '16px 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
                    Web Chat Widget Configuration
                  </h3>
                </label>
                <label>
                  Widget Color
                  <input
                    type="color"
                    value={form.config.widgetColor || '#4f46e5'}
                    onChange={(e) => updateConfig('widgetColor', e.target.value)}
                  />
                  <small style={{ color: '#64748b' }}>
                    Primary color for the chat widget
                  </small>
                </label>
                <label>
                  Welcome Message
                  <input
                    value={form.config.welcomeMessage || ''}
                    onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                    placeholder="Hi! How can I help you today?"
                  />
                  <small style={{ color: '#64748b' }}>
                    First message shown to users
                  </small>
                </label>
              </>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="submit"
                disabled={createChannel.isPending || updateChannel.isPending}
                className="primary-button"
              >
                {editingId ? 'Update Channel' : 'Create Channel'}
              </button>
              <button type="button" onClick={resetForm} className="secondary-button">
                Cancel
              </button>
            </div>

            {(createChannel.error || updateChannel.error) && (
              <div style={{
                gridColumn: '1 / -1',
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
              }}>
                <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                  Error: {createChannel.error?.message || updateChannel.error?.message}
                </p>
              </div>
            )}
          </form>
        </div>
      )}

      {channelsQuery.isLoading && <p>Loading channels...</p>}
      {channelsQuery.error && (
        <p style={{ color: '#dc2626' }}>
          Error loading channels: {channelsQuery.error.message}
        </p>
      )}

      {channelsQuery.data && channelsQuery.data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Tenant</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {channelsQuery.data.map((channel) => (
              <tr key={channel.id}>
                <td>
                  <strong>{channel.name}</strong>
                </td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: channel.type === 'whatsapp' ? '#dcfce7' : channel.type === 'messenger' ? '#dbeafe' : '#f3e8ff',
                    color: channel.type === 'whatsapp' ? '#166534' : channel.type === 'messenger' ? '#1e40af' : '#6b21a8',
                  }}>
                    {channel.type === 'webchat' ? 'Web Chat' : channel.type.charAt(0).toUpperCase() + channel.type.slice(1)}
                  </span>
                </td>
                <td>
                  <code style={{ fontSize: '12px' }}>{channel.tenantId.slice(0, 8)}...</code>
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
                      checked={channel.active}
                      onChange={(e) =>
                        toggleChannelStatus.mutate({ id: channel.id, active: e.target.checked })
                      }
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: channel.active ? '#059669' : '#64748b',
                    }}>
                      {channel.active ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </td>
                <td>{new Date(channel.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startEdit(channel)}
                      className="secondary-button"
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(channel.id, channel.name)}
                      disabled={deleteChannel.isPending}
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

      {channelsQuery.data && channelsQuery.data.length === 0 && !isCreating && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: '#64748b',
        }}>
          <p style={{ fontSize: '16px', marginBottom: '16px' }}>
            No channels configured yet.
          </p>
          <button onClick={() => setIsCreating(true)} className="primary-button">
            Create Your First Channel
          </button>
        </div>
      )}
    </section>
  );
}
