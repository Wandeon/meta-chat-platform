import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../routes/AuthProvider';
import { useApi } from '../api/client';

interface BotSettings {
  brandName: string;
  llm?: {
    systemPrompt?: string;
  };
}

const DEFAULT_INSTRUCTIONS = `You are a helpful assistant for our business. Please:
- Be friendly and professional
- Answer questions based on the knowledge base provided
- If you're unsure, say so honestly
- Keep responses concise and helpful`;

export function ClientSettingsPage() {
  const { getUser } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const user = getUser();

  const [botName, setBotName] = useState('');
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you today?');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch tenant settings
  const settingsQuery = useQuery({
    queryKey: ['tenant-settings', user?.tenantId],
    queryFn: () => api.get<{ settings: BotSettings; widgetConfig: any }>(`/api/tenants/${user?.tenantId}`),
    enabled: !!user?.tenantId,
  });

  // Load settings when data arrives
  useEffect(() => {
    if (settingsQuery.data) {
      setBotName(settingsQuery.data.settings?.brandName || '');
      setInstructions(settingsQuery.data.settings?.llm?.systemPrompt || DEFAULT_INSTRUCTIONS);
      setWelcomeMessage(settingsQuery.data.widgetConfig?.welcomeMessage || 'Hello! How can I help you today?');
    }
  }, [settingsQuery.data]);

  // Update mutation
  const updateSettings = useMutation({
    mutationFn: (data: { settings: Partial<BotSettings>; widgetConfig?: any }) =>
      api.patch(`/api/tenants/${user?.tenantId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', user?.tenantId] });
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSave = () => {
    updateSettings.mutate({
      settings: {
        brandName: botName,
        llm: {
          systemPrompt: instructions,
        },
      },
      widgetConfig: {
        welcomeMessage,
      },
    });
  };

  const handleChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setHasChanges(true);
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="dashboard-section">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="dashboard-section">
        <h1>Settings</h1>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Configure how your chatbot behaves and responds to visitors.
        </p>

        {/* Bot Identity */}
        <div className="settings-section" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Bot Identity</h2>
          
          <div className="form-grid">
            <label>
              Bot Name
              <input
                type="text"
                value={botName}
                onChange={(e) => handleChange(setBotName, e.target.value)}
                placeholder="My Assistant"
              />
              <small style={{ color: '#64748b' }}>
                This name appears in the chat header
              </small>
            </label>

            <label>
              Welcome Message
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => handleChange(setWelcomeMessage, e.target.value)}
                placeholder="Hello! How can I help you today?"
              />
              <small style={{ color: '#64748b' }}>
                First message visitors see when they open the chat
              </small>
            </label>
          </div>
        </div>

        {/* Bot Instructions */}
        <div className="settings-section" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Bot Instructions</h2>
          <p style={{ color: '#64748b', marginBottom: '12px', fontSize: '0.9rem' }}>
            Tell your bot how to behave - its personality, what to focus on, and any special rules.
          </p>
          
          <label>
            <textarea
              value={instructions}
              onChange={(e) => handleChange(setInstructions, e.target.value)}
              placeholder="Describe how your bot should behave..."
              style={{ minHeight: '200px', width: '100%', resize: 'vertical' }}
            />
          </label>
          
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleChange(setInstructions, DEFAULT_INSTRUCTIONS)}
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="primary-button"
            onClick={handleSave}
            disabled={updateSettings.isPending || !hasChanges}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          
          {saveSuccess && (
            <span style={{ color: '#10b981', fontWeight: 500 }}>
              ✓ Settings saved successfully
            </span>
          )}
          
          {updateSettings.isError && (
            <span style={{ color: '#ef4444' }}>
              Failed to save. Please try again.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
