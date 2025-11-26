import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
const DEFAULT_SETTINGS = {
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
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const api = useApi();
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [keywordInput, setKeywordInput] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
    const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
    const [apiKeyConfirmed, setApiKeyConfirmed] = useState(false);
    // Fetch tenant data
    const tenantQuery = useQuery({
        queryKey: ['tenant', tenantId],
        queryFn: () => api.get(`/api/tenants/${tenantId}`),
        enabled: !!tenantId,
    });
    // Fetch tenant API keys
    const apiKeysQuery = useQuery({
        queryKey: ['tenant-api-keys', tenantId],
        queryFn: () => api.get(`/api/security/tenants/${tenantId}/api-keys`),
        enabled: !!tenantId,
    });
    // Fetch global MCP servers
    const mcpServersQuery = useQuery({
        queryKey: ['mcp-servers'],
        queryFn: () => api.get('/api/mcp-servers'),
    });
    // Fetch available Ollama models (when baseUrl is set)
    const ollamaModelsQuery = useQuery({
        queryKey: ['ollama-models', settings.llm?.baseUrl],
        queryFn: () => api.get(`/api/ollama/models?baseUrl=${encodeURIComponent(settings.llm?.baseUrl || '')}`),
        enabled: !!settings.llm?.baseUrl && settings.llm?.provider === 'ollama',
        staleTime: 60000, // Cache for 1 minute
    });
    // Fetch available OpenAI models (when API key is confirmed)
    const openaiModelsQuery = useQuery({
        queryKey: ['openai-models', settings.llm?.apiKey, apiKeyConfirmed],
        queryFn: () => {
            console.log('[OpenAI Models] Fetching with API key:', settings.llm?.apiKey ? `${settings.llm.apiKey.substring(0, 10)}...` : 'EMPTY');
            console.log('[OpenAI Models] Provider:', settings.llm?.provider);
            return api.get('/api/ollama/openai-models', { apiKey: settings.llm?.apiKey || '' });
        },
        enabled: settings.llm?.provider === 'openai' && !!settings.llm?.apiKey && apiKeyConfirmed,
        staleTime: 300000, // Cache for 5 minutes (OpenAI models change less frequently)
    });
    // Load settings from tenant data
    useEffect(() => {
        if (tenantQuery.data?.settings) {
            setSettings({
                ...DEFAULT_SETTINGS,
                ...tenantQuery.data.settings,
            });
        }
    }, [tenantQuery.data]);
    // Reset API key confirmation when provider changes
    useEffect(() => {
        const provider = settings.llm?.provider;
        // Reset confirmation when provider changes
        setApiKeyConfirmed(false);
    }, [settings.llm?.provider]);
    // Update tenant mutation
    const updateTenant = useMutation({
        mutationFn: (data) => api.patch(`/api/tenants/${tenantId}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        },
    });
    // Create API key mutation
    const createApiKey = useMutation({
        mutationFn: (label) => api.post(`/api/security/tenants/${tenantId}/api-keys`, { label }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tenant-api-keys', tenantId] });
            setNewlyCreatedKey(data);
            setNewApiKeyLabel('');
        },
    });
    // Delete API key mutation
    const deleteApiKey = useMutation({
        mutationFn: (keyId) => api.delete(`/api/security/tenants/${tenantId}/api-keys/${keyId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant-api-keys', tenantId] });
        },
    });
    const handleSave = () => {
        updateTenant.mutate({ settings: settings });
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
    const handleRemoveKeyword = (index) => {
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
    const handleDeleteApiKey = (keyId) => {
        if (confirm('Are you sure you want to deactivate this API key? This action cannot be undone.')) {
            deleteApiKey.mutate(keyId);
        }
    };
    const handleCopyKey = (key) => {
        navigator.clipboard.writeText(key);
        alert('API key copied to clipboard!');
    };
    // MCP Server handlers
    const handleMcpToggle = (serverId, enabled) => {
        setSettings((prev) => {
            const configs = prev.mcpConfigs || [];
            const existingConfig = configs.find((c) => c.serverId === serverId);
            if (existingConfig) {
                // Update existing config
                return {
                    ...prev,
                    mcpConfigs: configs.map((c) => c.serverId === serverId ? { ...c, enabled } : c),
                };
            }
            else if (enabled) {
                // Add new config
                return {
                    ...prev,
                    mcpConfigs: [...configs, { serverId, enabled: true, credentials: {} }],
                };
            }
            return prev;
        });
    };
    const handleMcpCredentialChange = (serverId, key, value) => {
        setSettings((prev) => {
            const configs = prev.mcpConfigs || [];
            const existingConfig = configs.find((c) => c.serverId === serverId);
            if (existingConfig) {
                return {
                    ...prev,
                    mcpConfigs: configs.map((c) => c.serverId === serverId
                        ? { ...c, credentials: { ...c.credentials, [key]: value } }
                        : c),
                };
            }
            else {
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
        return (_jsx("section", { className: "dashboard-section", children: _jsx("p", { children: "Loading tenant settings..." }) }));
    }
    if (tenantQuery.error || !tenantQuery.data) {
        return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("p", { style: { color: '#dc2626' }, children: ["Error loading tenant: ", tenantQuery.error?.message || 'Tenant not found'] }), _jsx("button", { onClick: () => navigate('/tenants'), className: "secondary-button", children: "Back to Tenants" })] }));
    }
    return (_jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("div", { children: [_jsxs("h1", { children: ["Tenant Settings: ", tenantQuery.data.name] }), _jsx("p", { style: { margin: '8px 0 0 0', color: '#64748b' }, children: "Configure AI behavior, system prompts, and guardrails" })] }), _jsx("button", { onClick: () => navigate('/tenants'), className: "secondary-button", children: "\u2190 Back to Tenants" })] }), saveSuccess && (_jsx("div", { style: {
                    background: '#d1fae5',
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px',
                }, children: _jsx("p", { style: { margin: 0, color: '#065f46', fontWeight: 500 }, children: "\u2705 Settings saved successfully!" }) })), newlyCreatedKey && (_jsxs("div", { style: {
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '24px',
                }, children: [_jsx("h3", { style: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#92400e' }, children: "\uD83D\uDD11 New API Key Created - Save This Now!" }), _jsx("p", { style: { margin: '0 0 12px 0', color: '#78350f', fontSize: '14px' }, children: "This is the only time you'll see this key. Copy it and store it securely." }), _jsx("div", { style: {
                            background: '#fff',
                            border: '1px solid #d97706',
                            borderRadius: '6px',
                            padding: '12px',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            wordBreak: 'break-all',
                            marginBottom: '12px',
                        }, children: newlyCreatedKey.apiKey }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { onClick: () => handleCopyKey(newlyCreatedKey.apiKey), className: "primary-button", style: { fontSize: '14px' }, children: "\uD83D\uDCCB Copy to Clipboard" }), _jsx("button", { onClick: () => setNewlyCreatedKey(null), className: "secondary-button", style: { fontSize: '14px' }, children: "I've Saved It" })] })] })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '32px' }, children: [_jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "API Keys for WordPress Integration" }), _jsx("p", { style: { margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }, children: "Create API keys to authenticate your WordPress website or other applications. Use these keys in the WordPress widget code." }), _jsxs("div", { style: {
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '16px',
                                }, children: [_jsx("h3", { style: { margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }, children: "Create New API Key" }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' }, children: [_jsx("div", { style: { flex: 1 }, children: _jsx("input", { type: "text", value: newApiKeyLabel, onChange: (e) => setNewApiKeyLabel(e.target.value), placeholder: "e.g., WordPress Production, My Blog, Contact Form", style: { width: '100%' }, onKeyPress: (e) => e.key === 'Enter' && handleCreateApiKey() }) }), _jsx("button", { onClick: handleCreateApiKey, disabled: createApiKey.isPending || !newApiKeyLabel.trim(), className: "primary-button", children: createApiKey.isPending ? 'Creating...' : '+ Create Key' })] }), createApiKey.error && (_jsxs("p", { style: { margin: '8px 0 0 0', color: '#dc2626', fontSize: '13px' }, children: ["Error: ", createApiKey.error.message] }))] }), _jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }, children: "Existing API Keys" }), apiKeysQuery.isLoading && (_jsx("p", { style: { color: '#64748b', fontSize: '14px' }, children: "Loading API keys..." })), apiKeysQuery.error && (_jsxs("p", { style: { color: '#dc2626', fontSize: '14px' }, children: ["Error loading API keys: ", apiKeysQuery.error.message] })), apiKeysQuery.data && apiKeysQuery.data.length === 0 && (_jsx("p", { style: { color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }, children: "No API keys created yet. Create one above to get started." })), apiKeysQuery.data && apiKeysQuery.data.length > 0 && (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: apiKeysQuery.data.map((key) => (_jsxs("div", { style: {
                                                background: key.active ? '#fff' : '#f1f5f9',
                                                border: `1px solid ${key.active ? '#e2e8f0' : '#cbd5e1'}`,
                                                borderRadius: '8px',
                                                padding: '12px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                opacity: key.active ? 1 : 0.6,
                                            }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: '14px' }, children: key.label || 'Unnamed Key' }), !key.active && (_jsx("span", { style: {
                                                                        fontSize: '11px',
                                                                        padding: '2px 8px',
                                                                        background: '#fecaca',
                                                                        color: '#991b1b',
                                                                        borderRadius: '4px',
                                                                        fontWeight: 600,
                                                                    }, children: "INACTIVE" }))] }), _jsxs("div", { style: { fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }, children: [key.prefix, "_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", key.lastFour] }), _jsxs("div", { style: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' }, children: ["Created: ", new Date(key.createdAt).toLocaleDateString(), key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`] })] }), key.active && (_jsx("button", { onClick: () => handleDeleteApiKey(key.id), disabled: deleteApiKey.isPending, style: {
                                                        background: 'transparent',
                                                        border: '1px solid #dc2626',
                                                        color: '#dc2626',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }, children: "Deactivate" }))] }, key.id))) }))] }), _jsx("div", { style: {
                                    background: '#eff6ff',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginTop: '16px',
                                }, children: _jsxs("p", { style: { margin: 0, fontSize: '13px', color: '#1e40af' }, children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "Tip:" }), " For WordPress integration, copy your API key and paste it into the widget code. See the", ' ', _jsx("a", { href: "/WORDPRESS-INTEGRATION-GUIDE.md", target: "_blank", style: { color: '#2563eb', textDecoration: 'underline' }, children: "WordPress Integration Guide" }), ' ', "for detailed instructions."] }) })] }), _jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "Basic Configuration" }), _jsxs("div", { className: "form-grid", style: { gap: '16px' }, children: [_jsxs("label", { children: ["Brand Name", _jsx("input", { type: "text", value: settings.brandName, onChange: (e) => setSettings({ ...settings, brandName: e.target.value }), placeholder: "Your Brand Name" }), _jsx("small", { style: { color: '#64748b' }, children: "This name will be used in the AI's introduction" })] }), _jsxs("label", { children: ["Tone", _jsxs("select", { value: settings.tone, onChange: (e) => setSettings({ ...settings, tone: e.target.value }), children: [_jsx("option", { value: "friendly", children: "Friendly" }), _jsx("option", { value: "professional", children: "Professional" }), _jsx("option", { value: "casual", children: "Casual" }), _jsx("option", { value: "formal", children: "Formal" }), _jsx("option", { value: "enthusiastic", children: "Enthusiastic" }), _jsx("option", { value: "empathetic", children: "Empathetic" })] }), _jsx("small", { style: { color: '#64748b' }, children: "The conversational style the AI should adopt" })] }), _jsxs("label", { children: ["Locale", _jsx("input", { type: "text", value: settings.locale.join(', '), onChange: (e) => setSettings({
                                                    ...settings,
                                                    locale: e.target.value.split(',').map((l) => l.trim()).filter(Boolean),
                                                }), placeholder: "en-US, es-ES" }), _jsx("small", { style: { color: '#64748b' }, children: "Comma-separated list of preferred languages (e.g., en-US, es-ES, fr-FR)" })] }), _jsxs("label", { children: ["Preferred Language", _jsxs("select", { value: settings.language || 'en', onChange: (e) => setSettings({
                                                    ...settings,
                                                    language: e.target.value,
                                                }), children: [_jsx("option", { value: "en", children: "English" }), _jsx("option", { value: "hr", children: "Hrvatski (Croatian)" }), _jsx("option", { value: "de", children: "Deutsch (German)" }), _jsx("option", { value: "fr", children: "Fran\u00E7ais (French)" }), _jsx("option", { value: "es", children: "Espa\u00F1ol (Spanish)" }), _jsx("option", { value: "it", children: "Italiano (Italian)" }), _jsx("option", { value: "pt", children: "Portugu\u00EAs (Portuguese)" }), _jsx("option", { value: "nl", children: "Nederlands (Dutch)" }), _jsx("option", { value: "pl", children: "Polski (Polish)" }), _jsx("option", { value: "ru", children: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439 (Russian)" }), _jsx("option", { value: "cs", children: "\u010Ce\u0161tina (Czech)" }), _jsx("option", { value: "sl", children: "Sloven\u0161\u010Dina (Slovenian)" }), _jsx("option", { value: "sr", children: "\u0421\u0440\u043F\u0441\u043A\u0438 (Serbian)" })] }), _jsx("small", { style: { color: '#64748b' }, children: "Primary language for AI responses and RAG context templates. Used to filter knowledge base documents by language." })] })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "AI Model Configuration" }), _jsxs("div", { className: "form-grid", style: { gap: '16px' }, children: [_jsxs("label", { children: ["Provider", _jsxs("select", { value: settings.llm?.provider || 'openai', onChange: (e) => setSettings({
                                                    ...settings,
                                                    llm: { ...settings.llm, provider: e.target.value },
                                                }), children: [_jsx("option", { value: "openai", children: "OpenAI (Recommended)" }), _jsx("option", { value: "deepseek", children: "DeepSeek (Cost-Effective)" }), _jsx("option", { value: "ollama", children: "Ollama (Local/Free)" })] }), _jsxs("small", { style: { color: '#64748b' }, children: [settings.llm?.provider === 'openai' && 'OpenAI: Best function calling support, highly reliable ($2.50/1M tokens for GPT-4o)', settings.llm?.provider === 'deepseek' && 'DeepSeek: ~17x cheaper than OpenAI GPT-4 ($0.14/1M tokens), supports function calling', settings.llm?.provider === 'ollama' && 'Ollama: Free local models (requires installation, no function calling)'] })] }), (settings.llm?.provider === 'openai' || settings.llm?.provider === 'deepseek') && (_jsxs("label", { children: ["API Key", _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' }, children: [_jsx("input", { type: "password", value: settings.llm?.apiKey || '', onChange: (e) => {
                                                            const newKey = e.target.value;
                                                            console.log('[API Key] Changed, length:', newKey.length, 'provider:', settings.llm?.provider);
                                                            setSettings({
                                                                ...settings,
                                                                llm: { ...settings.llm, apiKey: newKey },
                                                            });
                                                            // Reset confirmation when key changes
                                                            setApiKeyConfirmed(false);
                                                        }, placeholder: settings.llm?.provider === 'openai' ? 'sk-proj-...' :
                                                            settings.llm?.provider === 'deepseek' ? 'sk-...' :
                                                                'Enter API key', style: { flex: 1 } }), _jsx("button", { type: "button", onClick: () => {
                                                            console.log('[API Key] Confirming API key for provider:', settings.llm?.provider);
                                                            setApiKeyConfirmed(true);
                                                        }, disabled: !settings.llm?.apiKey || settings.llm.apiKey.length === 0, style: {
                                                            padding: '8px 16px',
                                                            fontSize: '18px',
                                                            whiteSpace: 'nowrap',
                                                            cursor: (!settings.llm?.apiKey || settings.llm.apiKey.length === 0) ? 'not-allowed' : 'pointer',
                                                            opacity: (!settings.llm?.apiKey || settings.llm.apiKey.length === 0) ? 0.5 : 1,
                                                        }, title: "Confirm API key", children: "\u2713" })] }), _jsxs("small", { style: { color: '#64748b' }, children: [settings.llm?.provider === 'openai' && 'Enter your OpenAI API key from platform.openai.com, then click ✓ to confirm', settings.llm?.provider === 'deepseek' && 'Enter your DeepSeek API key from platform.deepseek.com, then click ✓ to confirm (or leave empty to use system default)'] })] })), _jsxs("label", { children: ["Model", _jsxs("select", { value: settings.llm?.model || '', onChange: (e) => setSettings({
                                                    ...settings,
                                                    llm: { ...settings.llm, model: e.target.value },
                                                }), disabled: (settings.llm?.provider === 'openai' || settings.llm?.provider === 'deepseek') && !apiKeyConfirmed, style: {
                                                    cursor: (settings.llm?.provider === 'openai' || settings.llm?.provider === 'deepseek') && !apiKeyConfirmed ? 'not-allowed' : 'pointer',
                                                    opacity: (settings.llm?.provider === 'openai' || settings.llm?.provider === 'deepseek') && !apiKeyConfirmed ? 0.6 : 1,
                                                }, children: [!apiKeyConfirmed && (settings.llm?.provider === 'openai' || settings.llm?.provider === 'deepseek') && (_jsx("option", { value: "", children: "Please confirm your API key above" })), settings.llm?.provider === 'openai' && apiKeyConfirmed && (_jsxs(_Fragment, { children: [openaiModelsQuery.isLoading && (_jsx("option", { value: "", children: "Loading models from OpenAI..." })), openaiModelsQuery.error && (_jsxs(_Fragment, { children: [_jsx("option", { value: "", children: "\u26A0\uFE0F Error loading models - check API key" }), _jsx("option", { value: "gpt-4o", children: "GPT-4o (Best, ~$2.50/1M tokens)" }), _jsx("option", { value: "gpt-4o-mini", children: "GPT-4o Mini (Fast, ~$0.15/1M tokens)" }), _jsx("option", { value: "gpt-4-turbo", children: "GPT-4 Turbo" }), _jsx("option", { value: "gpt-3.5-turbo", children: "GPT-3.5 Turbo (Cheapest)" }), _jsx("option", { value: "o1", children: "o1 (Reasoning)" }), _jsx("option", { value: "o1-mini", children: "o1-mini (Reasoning, Fast)" })] })), !openaiModelsQuery.isLoading && !openaiModelsQuery.error && openaiModelsQuery.data?.models && openaiModelsQuery.data.models.length > 0 && (openaiModelsQuery.data.models.map((model) => (_jsx("option", { value: model.id, children: model.name }, model.id)))), !openaiModelsQuery.isLoading && !openaiModelsQuery.error && (!openaiModelsQuery.data?.models || openaiModelsQuery.data.models.length === 0) && (_jsxs(_Fragment, { children: [_jsx("option", { value: "gpt-4o", children: "GPT-4o (Best, ~$2.50/1M tokens)" }), _jsx("option", { value: "gpt-4o-mini", children: "GPT-4o Mini (Fast, ~$0.15/1M tokens)" }), _jsx("option", { value: "gpt-4-turbo", children: "GPT-4 Turbo" }), _jsx("option", { value: "gpt-3.5-turbo", children: "GPT-3.5 Turbo (Cheapest)" }), _jsx("option", { value: "o1", children: "o1 (Reasoning)" }), _jsx("option", { value: "o1-mini", children: "o1-mini (Reasoning, Fast)" })] }))] })), settings.llm?.provider === 'deepseek' && apiKeyConfirmed && (_jsxs(_Fragment, { children: [_jsx("option", { value: "deepseek-chat", children: "DeepSeek Chat (General, $0.14/1M tokens)" }), _jsx("option", { value: "deepseek-coder", children: "DeepSeek Coder (For Code)" })] })), settings.llm?.provider === 'ollama' && (_jsxs(_Fragment, { children: [ollamaModelsQuery.isLoading && (_jsx("option", { value: "", children: "Loading models from Ollama..." })), ollamaModelsQuery.error && (_jsx("option", { value: "", children: "Error loading models - check Base URL" })), ollamaModelsQuery.data?.models && ollamaModelsQuery.data.models.length > 0 ? (ollamaModelsQuery.data.models.map((model) => (_jsxs("option", { value: model.name, children: [model.name, model.size && ` (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`] }, model.name)))) : !ollamaModelsQuery.isLoading && !ollamaModelsQuery.error ? (_jsx("option", { value: "", children: "No models found - check Base URL or pull models" })) : null] }))] }), _jsx("small", { style: { color: '#64748b' }, children: (settings.llm?.provider === 'openai' || settings.llm?.provider === 'deepseek') && !apiKeyConfirmed
                                                    ? 'Enter and confirm your API key above to enable model selection'
                                                    : 'Select the AI model to use for this tenant' })] }), (settings.llm?.provider === 'deepseek' || settings.llm?.provider === 'ollama') && (_jsxs("label", { children: ["Base URL", _jsx("input", { type: "text", value: settings.llm?.baseUrl || '', onChange: (e) => setSettings({
                                                    ...settings,
                                                    llm: { ...settings.llm, baseUrl: e.target.value },
                                                }), placeholder: settings.llm?.provider === 'deepseek' ? 'https://api.deepseek.com/v1' :
                                                    settings.llm?.provider === 'ollama' ? 'http://gpu-01.taildb94e1.ts.net:11434' :
                                                        '' }), _jsxs("small", { style: { color: '#64748b' }, children: [settings.llm?.provider === 'deepseek' && 'DeepSeek API endpoint (default: https://api.deepseek.com/v1)', settings.llm?.provider === 'ollama' && 'Ollama server URL (e.g., http://gpu-01.taildb94e1.ts.net:11434 or http://localhost:11434)'] })] })), _jsxs("label", { children: ["Temperature: ", settings.llm?.temperature || 0.7, _jsx("input", { type: "range", min: "0", max: "2", step: "0.1", value: settings.llm?.temperature || 0.7, onChange: (e) => setSettings({
                                                    ...settings,
                                                    llm: { ...settings.llm, temperature: parseFloat(e.target.value) },
                                                }) }), _jsx("small", { style: { color: '#64748b' }, children: "Lower = more focused, Higher = more creative (0-2)" })] }), _jsxs("label", { children: ["Top P: ", settings.llm?.topP || 1.0, _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: settings.llm?.topP || 1.0, onChange: (e) => setSettings({
                                                    ...settings,
                                                    llm: { ...settings.llm, topP: parseFloat(e.target.value) },
                                                }) }), _jsx("small", { style: { color: '#64748b' }, children: "Nucleus sampling threshold (0-1)" })] }), _jsxs("label", { children: ["Max Tokens", _jsx("input", { type: "number", min: "100", max: "8000", step: "100", value: settings.llm?.maxTokens || 2000, onChange: (e) => setSettings({
                                                    ...settings,
                                                    llm: { ...settings.llm, maxTokens: parseInt(e.target.value) },
                                                }) }), _jsx("small", { style: { color: '#64748b' }, children: "Maximum length of AI responses (100-8000)" })] })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "System Prompt & Guardrails" }), _jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '8px', fontWeight: 500 }, children: "Custom System Prompt" }), _jsx("textarea", { value: settings.llm?.systemPrompt || '', onChange: (e) => setSettings({
                                            ...settings,
                                            llm: { ...settings.llm, systemPrompt: e.target.value },
                                        }), rows: 12, placeholder: "Enter custom instructions for the AI assistant...", style: {
                                            fontFamily: 'monospace',
                                            fontSize: '13px',
                                            width: '100%',
                                            display: 'block',
                                            padding: '12px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            resize: 'vertical',
                                            lineHeight: '1.5',
                                        } }), _jsx("small", { style: { color: '#64748b', display: 'block', marginTop: '8px' }, children: "Additional instructions and guardrails for the AI. This will be combined with brand name, tone, and locale settings above." })] }), _jsxs("div", { style: {
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginTop: '16px',
                                }, children: [_jsx("h3", { style: { margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }, children: "Example Guardrails:" }), _jsx("pre", { style: {
                                            margin: 0,
                                            fontSize: '12px',
                                            color: '#475569',
                                            whiteSpace: 'pre-wrap',
                                            fontFamily: 'monospace',
                                        }, children: `• Always stay on topic and redirect off-topic questions
• Never provide medical, legal, or financial advice
• If unsure, say "I don't know" rather than guessing
• Keep responses concise and actionable
• For sensitive issues, offer to escalate to human support` })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "Features" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: settings.enableRag, onChange: (e) => setSettings({ ...settings, enableRag: e.target.checked }) }), _jsx("span", { children: "Enable Knowledge Base (RAG)" })] }), _jsx("small", { style: { marginLeft: '28px', color: '#64748b' }, children: "Allow the AI to retrieve information from uploaded documents" }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: settings.enableFunctionCalling, onChange: (e) => setSettings({ ...settings, enableFunctionCalling: e.target.checked }) }), _jsx("span", { children: "Enable Function Calling" })] }), _jsx("small", { style: { marginLeft: '28px', color: '#64748b' }, children: "Allow the AI to execute actions and integrations" }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: settings.enableHumanHandoff, onChange: (e) => setSettings({ ...settings, enableHumanHandoff: e.target.checked }) }), _jsx("span", { children: "Enable Human Handoff" })] }), _jsx("small", { style: { marginLeft: '28px', color: '#64748b' }, children: "Transfer conversations to human agents when triggered" })] })] }), settings.enableFunctionCalling && (_jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "MCP Tool Integrations" }), _jsx("p", { style: { margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }, children: "Enable Model Context Protocol (MCP) servers for this tenant. These provide tools like Google Calendar, GitHub, and other integrations." }), mcpServersQuery.isLoading && (_jsx("p", { style: { color: '#64748b', fontSize: '14px' }, children: "Loading MCP servers..." })), mcpServersQuery.error && (_jsx("div", { style: {
                                    background: '#fee2e2',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                }, children: _jsxs("p", { style: { margin: 0, color: '#991b1b', fontSize: '14px' }, children: ["Error loading MCP servers: ", mcpServersQuery.error.message] }) })), mcpServersQuery.data && mcpServersQuery.data.length === 0 && (_jsxs("div", { style: {
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '16px',
                                }, children: [_jsx("p", { style: { margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }, children: "No MCP servers configured yet." }), _jsx("button", { onClick: () => navigate('/mcp-servers'), className: "secondary-button", style: { fontSize: '13px' }, children: "Go to MCP Servers Settings" })] })), mcpServersQuery.data && mcpServersQuery.data.length > 0 && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [mcpServersQuery.data
                                        .filter((server) => server.enabled) // Only show globally enabled servers
                                        .map((server) => {
                                        const mcpConfig = (settings.mcpConfigs || []).find((c) => c.serverId === server.id);
                                        const isEnabled = mcpConfig?.enabled || false;
                                        const credentials = mcpConfig?.credentials || {};
                                        return (_jsxs("div", { style: {
                                                background: '#fff',
                                                border: `2px solid ${isEnabled ? '#3b82f6' : '#e2e8f0'}`,
                                                borderRadius: '8px',
                                                padding: '16px',
                                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEnabled && server.requiredEnv.length > 0 ? '12px' : '0' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: '15px', marginBottom: '4px' }, children: server.name }), server.description && (_jsx("div", { style: { fontSize: '13px', color: '#64748b' }, children: server.description }))] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: '16px' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 500, color: '#64748b' }, children: isEnabled ? 'ON' : 'OFF' }), _jsx("input", { type: "checkbox", checked: isEnabled, onChange: (e) => handleMcpToggle(server.id, e.target.checked), style: { cursor: 'pointer', width: '18px', height: '18px' } })] })] }), isEnabled && server.requiredEnv.length > 0 && (_jsxs("div", { style: {
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        padding: '12px',
                                                        marginTop: '12px',
                                                    }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#475569' }, children: "Required Credentials:" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: server.requiredEnv.map((envVar) => (_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#64748b' }, children: envVar }), _jsx("input", { type: "password", value: credentials[envVar] || '', onChange: (e) => handleMcpCredentialChange(server.id, envVar, e.target.value), placeholder: `Enter ${envVar}`, style: {
                                                                            width: '100%',
                                                                            padding: '8px',
                                                                            border: '1px solid #cbd5e1',
                                                                            borderRadius: '6px',
                                                                            fontSize: '13px',
                                                                            fontFamily: 'monospace',
                                                                        } })] }, envVar))) }), _jsx("p", { style: { margin: '8px 0 0 0', fontSize: '11px', color: '#94a3b8' }, children: "\uD83D\uDCA1 These credentials are specific to your account and encrypted in the database." })] }))] }, server.id));
                                    }), mcpServersQuery.data.filter((s) => s.enabled).length === 0 && (_jsxs("div", { style: {
                                            background: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            padding: '16px',
                                        }, children: [_jsx("p", { style: { margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }, children: "All MCP servers are globally disabled. Enable them first in MCP Servers settings." }), _jsx("button", { onClick: () => navigate('/mcp-servers'), className: "secondary-button", style: { fontSize: '13px' }, children: "Go to MCP Servers Settings" })] }))] }))] })), settings.enableHumanHandoff && (_jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "\uD83E\uDD16 Confidence-Based Escalation (AI Uncertainty Detection)" }), _jsx("p", { style: { margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }, children: "Intelligently escalate to human agents when the AI is uncertain about its response, instead of relying only on keywords. The AI analyzes its own confidence and escalates when it's not sure it can help properly." }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px' }, children: [_jsx("input", { type: "checkbox", checked: settings.confidenceEscalation?.enabled || false, onChange: (e) => setSettings({
                                            ...settings,
                                            confidenceEscalation: {
                                                ...(settings.confidenceEscalation || { mode: 'standard' }),
                                                enabled: e.target.checked,
                                            },
                                        }) }), _jsx("span", { style: { fontWeight: 500 }, children: "Enable Confidence-Based Escalation" })] }), settings.confidenceEscalation?.enabled && (_jsxs("div", { style: {
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    marginBottom: '16px',
                                }, children: [_jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("label", { style: { display: 'block', fontWeight: 500, marginBottom: '8px' }, children: "Escalation Mode" }), _jsxs("select", { value: settings.confidenceEscalation?.mode || 'standard', onChange: (e) => setSettings({
                                                    ...settings,
                                                    confidenceEscalation: {
                                                        ...settings.confidenceEscalation,
                                                        mode: e.target.value,
                                                    },
                                                }), style: { width: '100%' }, children: [_jsx("option", { value: "lenient", children: "Lenient - Trust AI More (Escalate less often)" }), _jsx("option", { value: "standard", children: "Standard - Balanced (Recommended)" }), _jsx("option", { value: "strict", children: "Strict - Be Cautious (Escalate more often)" })] }), _jsxs("small", { style: { color: '#64748b', display: 'block', marginTop: '4px' }, children: [settings.confidenceEscalation?.mode === 'strict' && '⚠️ Best for medical, legal, or financial domains. Escalates when confidence <50%.', settings.confidenceEscalation?.mode === 'standard' && '✅ Good for general support. Escalates when confidence <30%.', settings.confidenceEscalation?.mode === 'lenient' && '💬 Best for casual chat. Escalates when confidence <20%.'] })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("label", { style: { display: 'block', fontWeight: 500, marginBottom: '8px' }, children: "Self-Assessment Strategy" }), _jsxs("select", { value: settings.confidenceEscalation?.selfAssessmentStrategy || 'explicit_marker', onChange: (e) => setSettings({
                                                    ...settings,
                                                    confidenceEscalation: {
                                                        ...settings.confidenceEscalation,
                                                        selfAssessmentStrategy: e.target.value,
                                                    },
                                                }), style: { width: '100%' }, children: [_jsx("option", { value: "explicit_marker", children: "Explicit Marker (Recommended)" }), _jsx("option", { value: "chain_of_thought", children: "Chain of Thought" }), _jsx("option", { value: "uncertainty_acknowledgment", children: "Uncertainty Acknowledgment" })] }), _jsx("small", { style: { color: '#64748b', display: 'block', marginTop: '4px' }, children: "How the AI should express its confidence level in responses" })] }), _jsx("div", { style: { marginBottom: '20px' }, children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: settings.confidenceEscalation?.addDisclaimers !== false, onChange: (e) => setSettings({
                                                        ...settings,
                                                        confidenceEscalation: {
                                                            ...settings.confidenceEscalation,
                                                            addDisclaimers: e.target.checked,
                                                        },
                                                    }) }), _jsx("span", { style: { fontWeight: 500 }, children: "Add disclaimers to uncertain responses" })] }) }), settings.confidenceEscalation?.addDisclaimers !== false && (_jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("label", { style: { display: 'block', fontWeight: 500, marginBottom: '8px' }, children: "Custom Disclaimer Text (optional)" }), _jsx("textarea", { value: settings.confidenceEscalation?.disclaimerText || '', onChange: (e) => setSettings({
                                                    ...settings,
                                                    confidenceEscalation: {
                                                        ...settings.confidenceEscalation,
                                                        disclaimerText: e.target.value,
                                                    },
                                                }), rows: 3, placeholder: "Leave empty to use default disclaimer", style: {
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontFamily: 'inherit',
                                                } }), _jsx("small", { style: { color: '#64748b', display: 'block', marginTop: '4px' }, children: "Default: \"\u26A0\uFE0F Note: I may not have complete information about this topic. Please verify with an expert if this is important.\"" })] })), _jsxs("details", { style: { marginTop: '16px' }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 500, color: '#475569', fontSize: '14px' }, children: "Advanced Settings (Optional)" }), _jsxs("div", { style: { marginTop: '16px', paddingLeft: '12px', borderLeft: '2px solid #cbd5e1' }, children: [_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsxs("label", { style: { display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '13px' }, children: ["Immediate Escalation Threshold: ", (settings.confidenceEscalation?.immediateEscalationThreshold ?? (settings.confidenceEscalation?.mode === 'strict' ? 0.5 :
                                                                        settings.confidenceEscalation?.mode === 'lenient' ? 0.2 : 0.3) * 100).toFixed(0), "%"] }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: settings.confidenceEscalation?.immediateEscalationThreshold ?? (settings.confidenceEscalation?.mode === 'strict' ? 0.5 :
                                                                    settings.confidenceEscalation?.mode === 'lenient' ? 0.2 : 0.3), onChange: (e) => setSettings({
                                                                    ...settings,
                                                                    confidenceEscalation: {
                                                                        ...settings.confidenceEscalation,
                                                                        immediateEscalationThreshold: parseFloat(e.target.value),
                                                                    },
                                                                }) }), _jsx("small", { style: { color: '#64748b', display: 'block', marginTop: '4px' }, children: "Below this confidence, don't send AI response (immediate escalation)" })] }), _jsxs("div", { style: { marginBottom: '16px' }, children: [_jsxs("label", { style: { display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '13px' }, children: ["Suggest Review Threshold: ", (settings.confidenceEscalation?.suggestReviewThreshold ?? (settings.confidenceEscalation?.mode === 'strict' ? 0.75 :
                                                                        settings.confidenceEscalation?.mode === 'lenient' ? 0.4 : 0.6) * 100).toFixed(0), "%"] }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: settings.confidenceEscalation?.suggestReviewThreshold ?? (settings.confidenceEscalation?.mode === 'strict' ? 0.75 :
                                                                    settings.confidenceEscalation?.mode === 'lenient' ? 0.4 : 0.6), onChange: (e) => setSettings({
                                                                    ...settings,
                                                                    confidenceEscalation: {
                                                                        ...settings.confidenceEscalation,
                                                                        suggestReviewThreshold: parseFloat(e.target.value),
                                                                    },
                                                                }) }), _jsx("small", { style: { color: '#64748b', display: 'block', marginTop: '4px' }, children: "Below this confidence, send AI response but notify human for review" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontWeight: 500, marginBottom: '8px', fontSize: '13px' }, children: "Additional High-Stakes Domains" }), _jsx("input", { type: "text", value: (settings.confidenceEscalation?.highStakesDomains || []).join(', '), onChange: (e) => setSettings({
                                                                    ...settings,
                                                                    confidenceEscalation: {
                                                                        ...settings.confidenceEscalation,
                                                                        highStakesDomains: e.target.value
                                                                            .split(',')
                                                                            .map((s) => s.trim())
                                                                            .filter(Boolean),
                                                                    },
                                                                }), placeholder: "e.g., prescription, surgery, investment", style: { width: '100%' } }), _jsx("small", { style: { color: '#64748b', display: 'block', marginTop: '4px' }, children: "Comma-separated keywords for stricter thresholds (beyond default: medical, legal, financial)" })] })] })] }), _jsx("div", { style: {
                                            background: '#eff6ff',
                                            border: '1px solid #3b82f6',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            marginTop: '16px',
                                        }, children: _jsxs("p", { style: { margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }, children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "How it works:" }), " The AI analyzes its own confidence using multiple signals (self-assessment, uncertain language, response quality). When confidence is low, it automatically escalates to a human agent. This catches edge cases that keyword matching would miss."] }) })] }))] })), settings.enableHumanHandoff && (_jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "Human Handoff Keywords (Traditional)" }), _jsx("p", { style: { margin: '0 0 12px 0', color: '#64748b', fontSize: '14px' }, children: "When users say these words or phrases, the conversation will be escalated to a human agent (works alongside confidence-based escalation)" }), _jsxs("div", { style: { display: 'flex', gap: '8px', marginBottom: '12px' }, children: [_jsx("input", { type: "text", value: keywordInput, onChange: (e) => setKeywordInput(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleAddKeyword(), placeholder: "e.g., speak to human, customer service", style: { flex: 1 } }), _jsx("button", { onClick: handleAddKeyword, className: "secondary-button", children: "Add Keyword" })] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }, children: [settings.humanHandoffKeywords.map((keyword, index) => (_jsxs("span", { style: {
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: '#e0e7ff',
                                            color: '#3730a3',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                        }, children: [keyword, _jsx("button", { onClick: () => handleRemoveKeyword(index), style: {
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#3730a3',
                                                    cursor: 'pointer',
                                                    padding: '0 4px',
                                                    fontSize: '16px',
                                                    lineHeight: 1,
                                                }, children: "\u00D7" })] }, index))), settings.humanHandoffKeywords.length === 0 && (_jsx("p", { style: { color: '#94a3b8', fontSize: '14px', margin: 0 }, children: "No keywords configured. Add keywords above." }))] })] })), settings.enableRag && (_jsxs("div", { className: "settings-section", children: [_jsx("h2", { style: { margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }, children: "Knowledge Base Configuration (RAG)" }), _jsxs("div", { className: "form-grid", style: { gap: '16px' }, children: [_jsxs("label", { children: ["Top K Results: ", settings.ragConfig?.topK || 5, _jsx("input", { type: "range", min: "1", max: "20", step: "1", value: settings.ragConfig?.topK || 5, onChange: (e) => setSettings({
                                                    ...settings,
                                                    ragConfig: {
                                                        ...settings.ragConfig,
                                                        topK: parseInt(e.target.value),
                                                    },
                                                }) }), _jsx("small", { style: { color: '#64748b' }, children: "Number of document chunks to retrieve (1-20)" })] }), _jsxs("label", { children: ["Minimum Similarity: ", settings.ragConfig?.minSimilarity || 0.5, _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: settings.ragConfig?.minSimilarity || 0.5, onChange: (e) => setSettings({
                                                    ...settings,
                                                    ragConfig: {
                                                        ...settings.ragConfig,
                                                        minSimilarity: parseFloat(e.target.value),
                                                    },
                                                }) }), _jsx("small", { style: { color: '#64748b' }, children: "Minimum similarity score for retrieved chunks (0-1)" })] }), _jsxs("label", { children: ["Keyword Weight: ", settings.ragConfig?.hybridWeights?.keyword || 0.3, _jsx("input", { type: "range", min: "0", max: "1", step: "0.1", value: settings.ragConfig?.hybridWeights?.keyword || 0.3, onChange: (e) => setSettings({
                                                    ...settings,
                                                    ragConfig: {
                                                        ...settings.ragConfig,
                                                        hybridWeights: {
                                                            keyword: parseFloat(e.target.value),
                                                            vector: 1 - parseFloat(e.target.value),
                                                        },
                                                    },
                                                }) }), _jsx("small", { style: { color: '#64748b' }, children: "Balance between keyword search and vector similarity (0-1)" })] })] })] })), _jsxs("div", { style: { display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }, children: [_jsx("button", { onClick: handleSave, disabled: updateTenant.isPending, className: "primary-button", style: { minWidth: '120px' }, children: updateTenant.isPending ? 'Saving...' : 'Save Settings' }), _jsx("button", { onClick: () => navigate('/tenants'), className: "secondary-button", children: "Cancel" })] }), updateTenant.error && (_jsx("div", { style: {
                            background: '#fee2e2',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            padding: '16px',
                        }, children: _jsxs("p", { style: { margin: 0, color: '#991b1b' }, children: ["Error saving settings: ", updateTenant.error.message] }) }))] })] }));
}
//# sourceMappingURL=TenantSettingsPage.js.map