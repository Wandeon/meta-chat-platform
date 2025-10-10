import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import type { Tenant, UpdateTenantRequest } from '../api/types';

// Tenant API Key structure
interface TenantApiKey {
  id: string;
  label: string | null;
  prefix: string;
  lastFour: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  rotatedAt: string | null;
}

interface CreateApiKeyResponse {
  id: string;
  apiKey: string;
  lastFour: string;
  prefix: string;
}

// MCP Server types
interface McpServer {
  id: string;
  name: string;
  description: string | null;
  command: string;
  requiredEnv: string[];
  enabled: boolean;
}

interface McpConfig {
  serverId: string;
  enabled: boolean;
  credentials: Record<string, string>;
}

// Tenant Settings structure
interface TenantSettings {
  brandName: string;
  tone: string;
  locale: string[];
  enableRag: boolean;
  enableFunctionCalling: boolean;
  enableHumanHandoff: boolean;
  humanHandoffKeywords: string[];
  mcpConfigs?: McpConfig[]; // Per-tenant MCP configurations with credentials
  ragConfig?: {
    topK: number;
    minSimilarity: number;
    hybridWeights?: {
      keyword: number;
      vector: number;
    };
  };
  llm?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

const DEFAULT_SETTINGS: TenantSettings = {
  brandName: 'Meta Chat',
  tone: 'friendly',
  locale: ['en-US'],
  enableRag: false,
  enableFunctionCalling: false,
  enableHumanHandoff: false,
  humanHandoffKeywords: [],
  mcpConfigs: [],
  ragConfig: {
    topK: 5,
    minSimilarity: 0.5,
    hybridWeights: {
      keyword: 0.3,
      vector: 0.7,
    },
  },
  llm: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    topP: 1.0,
    maxTokens: 2000,
    systemPrompt: '',
  },
};

export function TenantSettingsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);
  const [keywordInput, setKeywordInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<CreateApiKeyResponse | null>(null);

  // Fetch tenant data
  const tenantQuery = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => api.get<Tenant>(`/api/tenants/${tenantId}`),
    enabled: !!tenantId,
  });

  // Fetch tenant API keys
  const apiKeysQuery = useQuery({
    queryKey: ['tenant-api-keys', tenantId],
    queryFn: () => api.get<TenantApiKey[]>(`/api/security/tenants/${tenantId}/api-keys`),
    enabled: !!tenantId,
  });

  // Fetch global MCP servers
  const mcpServersQuery = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => api.get<McpServer[]>('/api/mcp-servers'),
  });

  // Load settings from tenant data
  useEffect(() => {
    if (tenantQuery.data?.settings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(tenantQuery.data.settings as Partial<TenantSettings>),
      });
    }
  }, [tenantQuery.data]);

  // Update tenant mutation
  const updateTenant = useMutation({
    mutationFn: (data: UpdateTenantRequest) =>
      api.patch<Tenant, UpdateTenantRequest>(`/api/tenants/${tenantId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Create API key mutation
  const createApiKey = useMutation({
    mutationFn: (label: string) =>
      api.post<CreateApiKeyResponse, { label: string }>(
        `/api/security/tenants/${tenantId}/api-keys`,
        { label }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-api-keys', tenantId] });
      setNewlyCreatedKey(data);
      setNewApiKeyLabel('');
    },
  });

  // Delete API key mutation
  const deleteApiKey = useMutation({
    mutationFn: (keyId: string) =>
      api.delete(`/api/security/tenants/${tenantId}/api-keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-api-keys', tenantId] });
    },
  });

  const handleSave = () => {
    updateTenant.mutate({ settings: settings as unknown as Record<string, unknown> });
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      setSettings((prev) => ({
        ...prev,
        humanHandoffKeywords: [...prev.humanHandoffKeywords, keywordInput.trim()],
      }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      humanHandoffKeywords: prev.humanHandoffKeywords.filter((_, i) => i !== index),
    }));
  };

  const handleCreateApiKey = () => {
    if (newApiKeyLabel.trim()) {
      createApiKey.mutate(newApiKeyLabel.trim());
    }
  };

  const handleDeleteApiKey = (keyId: string) => {
    if (confirm('Are you sure you want to deactivate this API key? This action cannot be undone.')) {
      deleteApiKey.mutate(keyId);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert('API key copied to clipboard!');
  };

  // MCP Server handlers
  const handleMcpToggle = (serverId: string, enabled: boolean) => {
    setSettings((prev) => {
      const configs = prev.mcpConfigs || [];
      const existingConfig = configs.find((c) => c.serverId === serverId);

      if (existingConfig) {
        // Update existing config
        return {
          ...prev,
          mcpConfigs: configs.map((c) =>
            c.serverId === serverId ? { ...c, enabled } : c
          ),
        };
      } else if (enabled) {
        // Add new config
        return {
          ...prev,
          mcpConfigs: [...configs, { serverId, enabled: true, credentials: {} }],
        };
      }
      return prev;
    });
  };

  const handleMcpCredentialChange = (
    serverId: string,
    key: string,
    value: string
  ) => {
    setSettings((prev) => {
      const configs = prev.mcpConfigs || [];
      const existingConfig = configs.find((c) => c.serverId === serverId);

      if (existingConfig) {
        return {
          ...prev,
          mcpConfigs: configs.map((c) =>
            c.serverId === serverId
              ? { ...c, credentials: { ...c.credentials, [key]: value } }
              : c
          ),
        };
      } else {
        // Create new config with credential
        return {
          ...prev,
          mcpConfigs: [
            ...configs,
            { serverId, enabled: false, credentials: { [key]: value } },
          ],
        };
      }
    });
  };

  if (tenantQuery.isLoading) {
    return (
      <section className="dashboard-section">
        <p>Loading tenant settings...</p>
      </section>
    );
  }

  if (tenantQuery.error || !tenantQuery.data) {
    return (
      <section className="dashboard-section">
        <p style={{ color: '#dc2626' }}>
          Error loading tenant: {tenantQuery.error?.message || 'Tenant not found'}
        </p>
        <button onClick={() => navigate('/tenants')} className="secondary-button">
          Back to Tenants
        </button>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1>Tenant Settings: {tenantQuery.data.name}</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            Configure AI behavior, system prompts, and guardrails
          </p>
        </div>
        <button onClick={() => navigate('/tenants')} className="secondary-button">
          ← Back to Tenants
        </button>
      </div>

      {saveSuccess && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ margin: 0, color: '#065f46', fontWeight: 500 }}>
            ✅ Settings saved successfully!
          </p>
        </div>
      )}

      {/* New API Key Created */}
      {newlyCreatedKey && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#92400e' }}>
            🔑 New API Key Created - Save This Now!
          </h3>
          <p style={{ margin: '0 0 12px 0', color: '#78350f', fontSize: '14px' }}>
            This is the only time you'll see this key. Copy it and store it securely.
          </p>
          <div style={{
            background: '#fff',
            border: '1px solid #d97706',
            borderRadius: '6px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '14px',
            wordBreak: 'break-all',
            marginBottom: '12px',
          }}>
            {newlyCreatedKey.apiKey}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleCopyKey(newlyCreatedKey.apiKey)}
              className="primary-button"
              style={{ fontSize: '14px' }}
            >
              📋 Copy to Clipboard
            </button>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="secondary-button"
              style={{ fontSize: '14px' }}
            >
              I've Saved It
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* API Keys Management */}
        <div className="settings-section">
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
            API Keys for WordPress Integration
          </h2>
          <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }}>
            Create API keys to authenticate your WordPress website or other applications.
            Use these keys in the WordPress widget code.
          </p>

          {/* Create New API Key */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
              Create New API Key
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={newApiKeyLabel}
                  onChange={(e) => setNewApiKeyLabel(e.target.value)}
                  placeholder="e.g., WordPress Production, My Blog, Contact Form"
                  style={{ width: '100%' }}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateApiKey()}
                />
              </div>
              <button
                onClick={handleCreateApiKey}
                disabled={createApiKey.isPending || !newApiKeyLabel.trim()}
                className="primary-button"
              >
                {createApiKey.isPending ? 'Creating...' : '+ Create Key'}
              </button>
            </div>
            {createApiKey.error && (
              <p style={{ margin: '8px 0 0 0', color: '#dc2626', fontSize: '13px' }}>
                Error: {createApiKey.error.message}
              </p>
            )}
          </div>

          {/* API Keys List */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
              Existing API Keys
            </h3>
            {apiKeysQuery.isLoading && (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Loading API keys...</p>
            )}
            {apiKeysQuery.error && (
              <p style={{ color: '#dc2626', fontSize: '14px' }}>
                Error loading API keys: {apiKeysQuery.error.message}
              </p>
            )}
            {apiKeysQuery.data && apiKeysQuery.data.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
                No API keys created yet. Create one above to get started.
              </p>
            )}
            {apiKeysQuery.data && apiKeysQuery.data.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {apiKeysQuery.data.map((key) => (
                  <div
                    key={key.id}
                    style={{
                      background: key.active ? '#fff' : '#f1f5f9',
                      border: `1px solid ${key.active ? '#e2e8f0' : '#cbd5e1'}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: key.active ? 1 : 0.6,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                          {key.label || 'Unnamed Key'}
                        </span>
                        {!key.active && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            background: '#fecaca',
                            color: '#991b1b',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}>
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                        {key.prefix}_••••••••{key.lastFour}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        Created: {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    {key.active && (
                      <button
                        onClick={() => handleDeleteApiKey(key.id)}
                        disabled={deleteApiKey.isPending}
                        style={{
                          background: 'transparent',
                          border: '1px solid #dc2626',
                          color: '#dc2626',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            background: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '16px',
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
              💡 <strong>Tip:</strong> For WordPress integration, copy your API key and paste it into the widget code.
              See the{' '}
              <a href="/WORDPRESS-INTEGRATION-GUIDE.md" target="_blank" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                WordPress Integration Guide
              </a>{' '}
              for detailed instructions.
            </p>
          </div>
        </div>

        {/* Basic Configuration */}
        <div className="settings-section">
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
            Basic Configuration
          </h2>
          <div className="form-grid" style={{ gap: '16px' }}>
            <label>
              Brand Name
              <input
                type="text"
                value={settings.brandName}
                onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                placeholder="Your Brand Name"
              />
              <small style={{ color: '#64748b' }}>
                This name will be used in the AI's introduction
              </small>
            </label>

            <label>
              Tone
              <select
                value={settings.tone}
                onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="empathetic">Empathetic</option>
              </select>
              <small style={{ color: '#64748b' }}>
                The conversational style the AI should adopt
              </small>
            </label>

            <label>
              Locale
              <input
                type="text"
                value={settings.locale.join(', ')}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    locale: e.target.value.split(',').map((l) => l.trim()).filter(Boolean),
                  })
                }
                placeholder="en-US, es-ES"
              />
              <small style={{ color: '#64748b' }}>
                Comma-separated list of preferred languages (e.g., en-US, es-ES, fr-FR)
              </small>
            </label>
          </div>
        </div>

        {/* AI Model Configuration */}
        <div className="settings-section">
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
            AI Model Configuration
          </h2>
          <div className="form-grid" style={{ gap: '16px' }}>
            <label>
              Provider
              <select
                value={settings.llm?.provider || 'openai'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, provider: e.target.value },
                  })
                }
              >
                <option value="openai">OpenAI (Recommended)</option>
                <option value="deepseek">DeepSeek (Cost-Effective)</option>
                <option value="ollama">Ollama (Local/Free)</option>
              </select>
              <small style={{ color: '#64748b' }}>
                {settings.llm?.provider === 'openai' && 'OpenAI: Best function calling support, highly reliable ($2.50/1M tokens for GPT-4o)'}
                {settings.llm?.provider === 'deepseek' && 'DeepSeek: ~17x cheaper than OpenAI GPT-4 ($0.14/1M tokens), supports function calling'}
                {settings.llm?.provider === 'ollama' && 'Ollama: Free local models (requires installation, no function calling)'}
              </small>
            </label>

            <label>
              Model
              <select
                value={settings.llm?.model || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, model: e.target.value },
                  })
                }
              >
                {/* OpenAI Models */}
                {settings.llm?.provider === 'openai' && (
                  <>
                    <option value="gpt-4o">GPT-4o (Best, $2.50/1M tokens)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast, $0.15/1M tokens)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Cheapest)</option>
                  </>
                )}

                {/* DeepSeek Models */}
                {settings.llm?.provider === 'deepseek' && (
                  <>
                    <option value="deepseek-chat">DeepSeek Chat (General, $0.14/1M tokens)</option>
                    <option value="deepseek-coder">DeepSeek Coder (For Code)</option>
                  </>
                )}

                {/* Ollama Models */}
                {settings.llm?.provider === 'ollama' && (
                  <>
                    <option value="llama3.1:8b">Llama 3.1 8B (Recommended)</option>
                    <option value="llama3.1:70b">Llama 3.1 70B (Best Quality)</option>
                    <option value="llama3.2:3b">Llama 3.2 3B (Fast)</option>
                    <option value="mistral:7b">Mistral 7B</option>
                    <option value="phi3:3.8b">Phi 3 3.8B (Small)</option>
                    <option value="gemma2:9b">Gemma 2 9B</option>
                    <option value="qwen2.5:7b">Qwen 2.5 7B</option>
                    <option value="codellama:7b">CodeLlama 7B (For Code)</option>
                  </>
                )}
              </select>
              <small style={{ color: '#64748b' }}>
                Select the AI model to use for this tenant
              </small>
            </label>

            {/* API Key field - show for providers that need it */}
            {(settings.llm?.provider === 'openai' || settings.llm?.provider === 'deepseek') && (
              <label>
                API Key
                <input
                  type="password"
                  value={settings.llm?.apiKey || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      llm: { ...settings.llm, apiKey: e.target.value },
                    })
                  }
                  placeholder={
                    settings.llm?.provider === 'openai' ? 'sk-proj-...' :
                    settings.llm?.provider === 'deepseek' ? 'sk-...' :
                    'Enter API key'
                  }
                />
                <small style={{ color: '#64748b' }}>
                  {settings.llm?.provider === 'openai' && 'Optional: Leave empty to use system default. Get your key from platform.openai.com'}
                  {settings.llm?.provider === 'deepseek' && 'Optional: Leave empty to use system default. Get your key from platform.deepseek.com'}
                </small>
              </label>
            )}

            {/* Base URL field - show for DeepSeek and Ollama */}
            {(settings.llm?.provider === 'deepseek' || settings.llm?.provider === 'ollama') && (
              <label>
                Base URL
                <input
                  type="text"
                  value={settings.llm?.baseUrl || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      llm: { ...settings.llm, baseUrl: e.target.value },
                    })
                  }
                  placeholder={
                    settings.llm?.provider === 'deepseek' ? 'https://api.deepseek.com/v1' :
                    settings.llm?.provider === 'ollama' ? 'http://ArtemiPC:11434' :
                    ''
                  }
                />
                <small style={{ color: '#64748b' }}>
                  {settings.llm?.provider === 'deepseek' && 'DeepSeek API endpoint (default: https://api.deepseek.com/v1)'}
                  {settings.llm?.provider === 'ollama' && 'Ollama server URL (e.g., http://ArtemiPC:11434 or http://localhost:11434)'}
                </small>
              </label>
            )}

            <label>
              Temperature: {settings.llm?.temperature || 0.7}
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.llm?.temperature || 0.7}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, temperature: parseFloat(e.target.value) },
                  })
                }
              />
              <small style={{ color: '#64748b' }}>
                Lower = more focused, Higher = more creative (0-2)
              </small>
            </label>

            <label>
              Top P: {settings.llm?.topP || 1.0}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.llm?.topP || 1.0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, topP: parseFloat(e.target.value) },
                  })
                }
              />
              <small style={{ color: '#64748b' }}>
                Nucleus sampling threshold (0-1)
              </small>
            </label>

            <label>
              Max Tokens
              <input
                type="number"
                min="100"
                max="8000"
                step="100"
                value={settings.llm?.maxTokens || 2000}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, maxTokens: parseInt(e.target.value) },
                  })
                }
              />
              <small style={{ color: '#64748b' }}>
                Maximum length of AI responses (100-8000)
              </small>
            </label>
          </div>
        </div>

        {/* System Prompt & Guardrails */}
        <div className="settings-section">
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
            System Prompt & Guardrails
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Custom System Prompt
            </label>
            <textarea
              value={settings.llm?.systemPrompt || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  llm: { ...settings.llm, systemPrompt: e.target.value },
                })
              }
              rows={12}
              placeholder="Enter custom instructions for the AI assistant..."
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                width: '100%',
                display: 'block',
                padding: '12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                resize: 'vertical',
                lineHeight: '1.5',
              }}
            />
            <small style={{ color: '#64748b', display: 'block', marginTop: '8px' }}>
              Additional instructions and guardrails for the AI. This will be combined with brand
              name, tone, and locale settings above.
            </small>
          </div>

          <div style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '16px',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
              Example Guardrails:
            </h3>
            <pre style={{
              margin: 0,
              fontSize: '12px',
              color: '#475569',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
            }}>
{`• Always stay on topic and redirect off-topic questions
• Never provide medical, legal, or financial advice
• If unsure, say "I don't know" rather than guessing
• Keep responses concise and actionable
• For sensitive issues, offer to escalate to human support`}
            </pre>
          </div>
        </div>

        {/* Features */}
        <div className="settings-section">
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>Features</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.enableRag}
                onChange={(e) => setSettings({ ...settings, enableRag: e.target.checked })}
              />
              <span>Enable Knowledge Base (RAG)</span>
            </label>
            <small style={{ marginLeft: '28px', color: '#64748b' }}>
              Allow the AI to retrieve information from uploaded documents
            </small>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.enableFunctionCalling}
                onChange={(e) =>
                  setSettings({ ...settings, enableFunctionCalling: e.target.checked })
                }
              />
              <span>Enable Function Calling</span>
            </label>
            <small style={{ marginLeft: '28px', color: '#64748b' }}>
              Allow the AI to execute actions and integrations
            </small>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.enableHumanHandoff}
                onChange={(e) =>
                  setSettings({ ...settings, enableHumanHandoff: e.target.checked })
                }
              />
              <span>Enable Human Handoff</span>
            </label>
            <small style={{ marginLeft: '28px', color: '#64748b' }}>
              Transfer conversations to human agents when triggered
            </small>
          </div>
        </div>

        {/* MCP Servers */}
        <div className="settings-section">
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
            MCP Tool Integrations
          </h2>
          <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }}>
            Enable Model Context Protocol (MCP) servers for this tenant. These provide tools like Google Calendar, GitHub, and other integrations.
          </p>

          {mcpServersQuery.isLoading && (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading MCP servers...</p>
          )}

          {mcpServersQuery.error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                Error loading MCP servers: {mcpServersQuery.error.message}
              </p>
            </div>
          )}

          {mcpServersQuery.data && mcpServersQuery.data.length === 0 && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }}>
                No MCP servers configured yet.
              </p>
              <button
                onClick={() => navigate('/mcp-servers')}
                className="secondary-button"
                style={{ fontSize: '13px' }}
              >
                Go to MCP Servers Settings
              </button>
            </div>
          )}

          {mcpServersQuery.data && mcpServersQuery.data.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mcpServersQuery.data
                .filter((server) => server.enabled)
                .map((server) => {
                  const mcpConfig = (settings.mcpConfigs || []).find((c) => c.serverId === server.id);
                  const isEnabled = mcpConfig?.enabled || false;
                  const credentials = mcpConfig?.credentials || {};

                  return (
                    <div
                      key={server.id}
                      style={{
                        background: '#fff',
                        border: `2px solid ${isEnabled ? '#3b82f6' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      {/* Header with toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                            {server.name}
                          </div>
                          {server.description && (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              {server.description}
                            </div>
                          )}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleMcpToggle(server.id, e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>

                      {/* Credentials section (only if server has requiredEnv) */}
                      {server.requiredEnv.length > 0 && (
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '12px',
                          marginTop: '12px',
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#475569' }}>
                            Required Credentials:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {server.requiredEnv.map((envVar) => (
                              <div key={envVar}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#64748b' }}>
                                  {envVar}
                                </label>
                                <input
                                  type="password"
                                  value={credentials[envVar] || ''}
                                  onChange={(e) => handleMcpCredentialChange(server.id, envVar, e.target.value)}
                                  placeholder={`Enter ${envVar}`}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                            💡 These credentials are specific to your account and encrypted in the database.
                          </p>
                        </div>
                      )}

                      {server.requiredEnv.length === 0 && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                          No credentials required for this server.
                        </p>
                      )}
                    </div>
                  );
                })}

              {mcpServersQuery.data.filter((s) => s.enabled).length === 0 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }}>
                    All MCP servers are globally disabled. Enable them first in MCP Servers settings.
                  </p>
                  <button
                    onClick={() => navigate('/mcp-servers')}
                    className="secondary-button"
                    style={{ fontSize: '13px' }}
                  >
                    Go to MCP Servers Settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Human Handoff Keywords */}
        {settings.enableHumanHandoff && (
          <div className="settings-section">
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
              Human Handoff Keywords
            </h2>
            <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }}>
              When users say these words or phrases, the conversation will be escalated to a human
              agent
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                placeholder="e.g., speak to human, customer service"
                style={{ flex: 1 }}
              />
              <button onClick={handleAddKeyword} className="secondary-button">
                Add Keyword
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {settings.humanHandoffKeywords.map((keyword, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(index)}
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
              {settings.humanHandoffKeywords.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                  No keywords configured. Add keywords above.
                </p>
              )}
            </div>
          </div>
        )}

        {/* RAG Configuration */}
        {settings.enableRag && (
          <div className="settings-section">
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
              Knowledge Base Configuration (RAG)
            </h2>
            <div className="form-grid" style={{ gap: '16px' }}>
              <label>
                Top K Results: {settings.ragConfig?.topK || 5}
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={settings.ragConfig?.topK || 5}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragConfig: {
                        ...settings.ragConfig!,
                        topK: parseInt(e.target.value),
                      },
                    })
                  }
                />
                <small style={{ color: '#64748b' }}>
                  Number of document chunks to retrieve (1-20)
                </small>
              </label>

              <label>
                Minimum Similarity: {settings.ragConfig?.minSimilarity || 0.5}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.ragConfig?.minSimilarity || 0.5}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragConfig: {
                        ...settings.ragConfig!,
                        minSimilarity: parseFloat(e.target.value),
                      },
                    })
                  }
                />
                <small style={{ color: '#64748b' }}>
                  Minimum similarity score for retrieved chunks (0-1)
                </small>
              </label>

              <label>
                Keyword Weight: {settings.ragConfig?.hybridWeights?.keyword || 0.3}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.ragConfig?.hybridWeights?.keyword || 0.3}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ragConfig: {
                        ...settings.ragConfig!,
                        hybridWeights: {
                          keyword: parseFloat(e.target.value),
                          vector: 1 - parseFloat(e.target.value),
                        },
                      },
                    })
                  }
                />
                <small style={{ color: '#64748b' }}>
                  Balance between keyword search and vector similarity (0-1)
                </small>
              </label>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={handleSave}
            disabled={updateTenant.isPending}
            className="primary-button"
            style={{ minWidth: '120px' }}
          >
            {updateTenant.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          <button onClick={() => navigate('/tenants')} className="secondary-button">
            Cancel
          </button>
        </div>

        {updateTenant.error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <p style={{ margin: 0, color: '#991b1b' }}>
              Error saving settings: {updateTenant.error.message}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
