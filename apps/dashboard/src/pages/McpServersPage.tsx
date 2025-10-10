import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

// MCP Server types
interface McpServer {
  id: string;
  name: string;
  description: string | null;
  command: string;
  args: string[];
  requiredEnv: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateMcpServerRequest {
  name: string;
  description?: string;
  command: string;
  args: string[];
  requiredEnv: string[];
  enabled?: boolean;
}

interface UpdateMcpServerRequest {
  name?: string;
  description?: string;
  command?: string;
  args?: string[];
  requiredEnv?: string[];
  enabled?: boolean;
}

export function McpServersPage() {
  const api = useApi();
  const queryClient = useQueryClient();

  // State for create/edit form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [formData, setFormData] = useState<CreateMcpServerRequest>({
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
    queryFn: () => api.get<McpServer[]>('/api/mcp-servers'),
  });

  // Create MCP server mutation
  const createServer = useMutation({
    mutationFn: (data: CreateMcpServerRequest) =>
      api.post<McpServer, CreateMcpServerRequest>('/api/mcp-servers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      handleCloseForm();
    },
  });

  // Update MCP server mutation
  const updateServer = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMcpServerRequest }) =>
      api.patch<McpServer, UpdateMcpServerRequest>(`/api/mcp-servers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      handleCloseForm();
    },
  });

  // Delete MCP server mutation
  const deleteServer = useMutation({
    mutationFn: (id: string) => api.delete(`/api/mcp-servers/${id}`),
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

  const handleOpenEdit = (server: McpServer) => {
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
    } else {
      createServer.mutate(formData);
    }
  };

  const handleDelete = (server: McpServer) => {
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

  const handleRemoveArg = (index: number) => {
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

  const handleRemoveRequiredEnv = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requiredEnv: prev.requiredEnv.filter((_, i) => i !== index),
    }));
  };

  if (serversQuery.isLoading) {
    return (
      <section className="dashboard-section">
        <p>Loading MCP servers...</p>
      </section>
    );
  }

  if (serversQuery.error) {
    return (
      <section className="dashboard-section">
        <p style={{ color: '#dc2626' }}>Error loading MCP servers: {serversQuery.error.message}</p>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1>Global MCP Servers</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            Configure Model Context Protocol servers for tool integrations
          </p>
        </div>
        <button onClick={handleOpenCreate} className="primary-button">
          + Add MCP Server
        </button>
      </div>

      {/* Info Box */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
          💡 <strong>MCP Servers</strong> provide tools like Google Calendar, GitHub, or custom integrations.
          Add servers here, then enable them per tenant in Tenant Settings.
        </p>
      </div>

      {/* MCP Servers List */}
      {serversQuery.data && serversQuery.data.length === 0 ? (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '16px' }}>
            No MCP servers configured yet
          </p>
          <p style={{ margin: '0 0 24px 0', color: '#94a3b8', fontSize: '14px' }}>
            Add your first MCP server to enable tool integrations for your chatbots
          </p>
          <button onClick={handleOpenCreate} className="primary-button">
            + Add First MCP Server
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {serversQuery.data?.map((server) => (
            <div
              key={server.id}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                      {server.name}
                    </h3>
                    {server.enabled ? (
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: '#d1fae5',
                        color: '#065f46',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}>
                        ENABLED
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        background: '#f1f5f9',
                        color: '#475569',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}>
                        DISABLED
                      </span>
                    )}
                  </div>

                  {server.description && (
                    <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }}>
                      {server.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#475569' }}>
                      <strong>Command:</strong>{' '}
                      <code style={{
                        background: '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                      }}>
                        {server.command}
                      </code>
                    </div>

                    {server.args.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#475569' }}>
                        <strong>Args:</strong>{' '}
                        {server.args.map((arg, i) => (
                          <code key={i} style={{
                            background: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            marginRight: '4px',
                          }}>
                            {arg}
                          </code>
                        ))}
                      </div>
                    )}

                    {server.requiredEnv.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#475569' }}>
                        <strong>Required Environment Variables:</strong>{' '}
                        {server.requiredEnv.map((envVar, i) => (
                          <code key={i} style={{
                            background: '#fef3c7',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            marginRight: '4px',
                            color: '#92400e',
                          }}>
                            {envVar}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>

                  <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Created: {new Date(server.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenEdit(server)}
                    className="secondary-button"
                    style={{ fontSize: '13px', padding: '6px 12px' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(server)}
                    disabled={deleteServer.isPending}
                    style={{
                      background: 'transparent',
                      border: '1px solid #dc2626',
                      color: '#dc2626',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {isFormOpen && (
        <div style={{
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
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 600 }}>
              {editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
            </h2>

            {/* Name */}
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Name <span style={{ color: '#dc2626' }}>*</span>
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Google Calendar, GitHub"
                style={{ width: '100%' }}
              />
            </label>

            {/* Description */}
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Description
              </span>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </label>

            {/* Command */}
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Command <span style={{ color: '#dc2626' }}>*</span>
              </span>
              <input
                type="text"
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                placeholder="e.g., npx, node, python"
                style={{ width: '100%' }}
              />
              <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                The executable to run (e.g., npx, node, python, /path/to/binary)
              </small>
            </label>

            {/* Arguments */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Arguments
              </span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={argInput}
                  onChange={(e) => setArgInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddArg()}
                  placeholder="e.g., -s, @modelcontextprotocol/server-google-calendar"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddArg} className="secondary-button">
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formData.args.map((arg, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#e0e7ff',
                      color: '#3730a3',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {arg}
                    <button
                      onClick={() => handleRemoveArg(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#3730a3',
                        cursor: 'pointer',
                        padding: '0 4px',
                        fontSize: '16px',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.args.length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                    No arguments. Add optional arguments above.
                  </p>
                )}
              </div>
            </div>

            {/* Required Environment Variables */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Required Environment Variables
              </span>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
                List the names of environment variables that tenants must provide (e.g., API keys, tokens).
                Tenants will enter the actual values in their settings.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={requiredEnvInput}
                  onChange={(e) => setRequiredEnvInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRequiredEnv()}
                  placeholder="e.g., GOOGLE_CLIENT_ID, GITHUB_TOKEN"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddRequiredEnv} className="secondary-button">
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formData.requiredEnv.map((envVar, index) => (
                  <span
                    key={index}
                    style={{
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
                    }}
                  >
                    {envVar}
                    <button
                      onClick={() => handleRemoveRequiredEnv(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#92400e',
                        cursor: 'pointer',
                        padding: '0 4px',
                        fontSize: '16px',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.requiredEnv.length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                    No required environment variables. Tenants won't need to provide credentials.
                  </p>
                )}
              </div>
            </div>

            {/* Enabled Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <span>Enabled (available for tenants to activate)</span>
            </label>

            {/* Error Messages */}
            {(createServer.error || updateServer.error) && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                  Error: {(createServer.error || updateServer.error)?.message}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseForm}
                className="secondary-button"
                disabled={createServer.isPending || updateServer.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="primary-button"
                disabled={createServer.isPending || updateServer.isPending}
              >
                {createServer.isPending || updateServer.isPending
                  ? 'Saving...'
                  : editingServer
                  ? 'Update Server'
                  : 'Create Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
