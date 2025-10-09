import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import type { Tenant, UpdateTenantRequest } from '../api/types';

// Tenant Settings structure
interface TenantSettings {
  brandName: string;
  tone: string;
  locale: string[];
  enableRag: boolean;
  enableFunctionCalling: boolean;
  enableHumanHandoff: boolean;
  humanHandoffKeywords: string[];
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

  // Fetch tenant data
  const tenantQuery = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => api.get<Tenant>(`/api/tenants/${tenantId}`),
    enabled: !!tenantId,
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
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
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="azure-openai">Azure OpenAI</option>
              </select>
            </label>

            <label>
              Model
              <input
                type="text"
                value={settings.llm?.model || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    llm: { ...settings.llm, model: e.target.value },
                  })
                }
                placeholder="gpt-4o, claude-3-5-sonnet-latest"
              />
              <small style={{ color: '#64748b' }}>
                Model name (e.g., gpt-4o, gpt-4o-mini, claude-3-5-sonnet-latest)
              </small>
            </label>

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
          <label>
            Custom System Prompt
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
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
            />
            <small style={{ color: '#64748b' }}>
              Additional instructions and guardrails for the AI. This will be combined with brand
              name, tone, and locale settings above.
            </small>
          </label>

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
