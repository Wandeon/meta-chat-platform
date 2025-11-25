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
  const [errors, setErrors] = useState<{ botName?: string; welcomeMessage?: string }>({});
  const [touched, setTouched] = useState<{ botName?: boolean; welcomeMessage?: boolean }>({});

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
      // Reset touched state when data is loaded
      setTouched({});
      setErrors({});
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
      setTouched({});
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Validation function - validates current values
  const validateField = (field: 'botName' | 'welcomeMessage', value: string): string | undefined => {
    if (field === 'botName') {
      if (!value.trim()) {
        return 'Bot name is required';
      }
      if (value.length > 50) {
        return 'Bot name must be 50 characters or less';
      }
    }
    if (field === 'welcomeMessage') {
      if (!value.trim()) {
        return 'Welcome message is required';
      }
      if (value.length > 200) {
        return 'Welcome message must be 200 characters or less';
      }
    }
    return undefined;
  };

  // Validate all fields and return if valid
  const validateAll = (): boolean => {
    const newErrors: typeof errors = {};

    const botNameError = validateField('botName', botName);
    if (botNameError) newErrors.botName = botNameError;

    const welcomeError = validateField('welcomeMessage', welcomeMessage);
    if (welcomeError) newErrors.welcomeMessage = welcomeError;

    setErrors(newErrors);
    // Mark all fields as touched to show errors
    setTouched({ botName: true, welcomeMessage: true });

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    // Always validate before saving
    if (!validateAll()) {
      return;
    }

    updateSettings.mutate({
      settings: {
        brandName: botName.trim(),
        llm: {
          systemPrompt: instructions.trim(),
        },
      },
      widgetConfig: {
        welcomeMessage: welcomeMessage.trim(),
      },
    });
  };

  const handleChange = (field: 'botName' | 'welcomeMessage' | 'instructions', value: string) => {
    // Update the field value
    if (field === 'botName') {
      setBotName(value);
      // Validate on change if field was touched
      if (touched.botName) {
        const error = validateField('botName', value);
        setErrors(prev => ({ ...prev, botName: error }));
      }
    } else if (field === 'welcomeMessage') {
      setWelcomeMessage(value);
      if (touched.welcomeMessage) {
        const error = validateField('welcomeMessage', value);
        setErrors(prev => ({ ...prev, welcomeMessage: error }));
      }
    } else {
      setInstructions(value);
    }

    setHasChanges(true);
  };

  const handleBlur = (field: 'botName' | 'welcomeMessage') => {
    // Mark as touched and validate on blur
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = field === 'botName' ? botName : welcomeMessage;
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleResetInstructions = () => {
    if (confirm('Reset bot instructions to default?\n\nThis will replace your custom instructions with the default template.')) {
      handleChange('instructions', DEFAULT_INSTRUCTIONS);
    }
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="dashboard-section">
        <p>Loading settings...</p>
      </div>
    );
  }

  // Check if form is valid for enabling save button
  const hasValidationErrors = Object.values(errors).some(e => e);
  const canSave = hasChanges && !hasValidationErrors && botName.trim() && welcomeMessage.trim();

  // Determine why save is disabled
  const getSaveButtonTooltip = () => {
    if (!hasChanges) return 'No changes to save';
    if (!botName.trim()) return 'Bot name is required';
    if (!welcomeMessage.trim()) return 'Welcome message is required';
    if (hasValidationErrors) return 'Please fix validation errors';
    return '';
  };

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
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Bot Name <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input
                type="text"
                value={botName}
                onChange={(e) => handleChange('botName', e.target.value)}
                onBlur={() => handleBlur('botName')}
                placeholder="My Assistant"
                style={{
                  borderColor: errors.botName && touched.botName ? '#ef4444' : undefined,
                  background: errors.botName && touched.botName ? '#fef2f2' : undefined
                }}
              />
              {errors.botName && touched.botName ? (
                <small style={{ color: '#ef4444' }}>{errors.botName}</small>
              ) : (
                <small style={{ color: '#64748b' }}>
                  This name appears in the chat header ({50 - botName.length} chars left)
                </small>
              )}
            </label>

            <label>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Welcome Message <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                onBlur={() => handleBlur('welcomeMessage')}
                placeholder="Hello! How can I help you today?"
                style={{
                  borderColor: errors.welcomeMessage && touched.welcomeMessage ? '#ef4444' : undefined,
                  background: errors.welcomeMessage && touched.welcomeMessage ? '#fef2f2' : undefined
                }}
              />
              {errors.welcomeMessage && touched.welcomeMessage ? (
                <small style={{ color: '#ef4444' }}>{errors.welcomeMessage}</small>
              ) : (
                <small style={{ color: '#64748b' }}>
                  First message visitors see when they open the chat ({200 - welcomeMessage.length} chars left)
                </small>
              )}
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
              onChange={(e) => handleChange('instructions', e.target.value)}
              placeholder="Describe how your bot should behave..."
              style={{ minHeight: '200px', width: '100%', resize: 'vertical' }}
            />
          </label>

          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleResetInstructions}
              style={{
                fontSize: '0.85rem',
                padding: '6px 12px',
                color: '#dc2626',
                borderColor: '#fecaca',
                background: '#fef2f2'
              }}
            >
              Reset to Default
            </button>
            <span style={{ marginLeft: '12px', fontSize: '13px', color: '#64748b' }}>
              This will replace your custom instructions
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="primary-button"
              onClick={handleSave}
              disabled={updateSettings.isPending || !canSave}
              title={getSaveButtonTooltip()}
              style={{
                opacity: !canSave && !updateSettings.isPending ? 0.5 : 1,
              }}
            >
              {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {!hasChanges && !saveSuccess && !updateSettings.isError && (
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              No unsaved changes
            </span>
          )}

          {hasChanges && !canSave && (
            <span style={{ color: '#f59e0b', fontSize: '14px' }}>
              Please fill in all required fields
            </span>
          )}

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
