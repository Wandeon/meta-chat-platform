import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { useAuth } from '../routes/AuthProvider';
import { Link } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  conversationId?: string;
  metadata?: {
    model?: string;
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    latency?: number;
    ragEnabled?: boolean;
    contextUsed?: boolean;
  };
}

// Helper to detect specific error types
const getErrorInfo = (errorMessage: string): { type: string; title: string; description: string; actionLink?: string; actionText?: string } => {
  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('missing api key') || lowerError.includes('api key') || lowerError.includes('apikey')) {
    return {
      type: 'config',
      title: 'API Key Not Configured',
      description: 'Your chatbot needs an API key to connect to the AI model. Please configure your LLM settings.',
      actionLink: '/settings',
      actionText: 'Go to Settings'
    };
  }

  if (lowerError.includes('model') || lowerError.includes('ollama') || lowerError.includes('openai')) {
    return {
      type: 'config',
      title: 'Model Configuration Issue',
      description: 'There may be an issue with your AI model configuration. Check your settings.',
      actionLink: '/settings',
      actionText: 'Check Settings'
    };
  }

  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return {
      type: 'network',
      title: 'Connection Error',
      description: 'Could not reach the server. Please check your internet connection and try again.',
    };
  }

  return {
    type: 'unknown',
    title: 'Error',
    description: errorMessage,
  };
};

export function TestingPage() {
  const api = useApi();
  const { getUser } = useAuth();
  const user = getUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<any>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch tenant settings
  const tenantQuery = useQuery({
    queryKey: ['tenant-settings', user?.tenantId],
    queryFn: () => api.get<any>(`/api/tenants/${user?.tenantId}`),
    enabled: !!user?.tenantId,
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user?.tenantId) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const response = await api.post<ChatResponse, any>('/api/chat', {
        message: inputMessage,
        tenantId: user?.tenantId,
        conversationId: conversationId,
      });
      const latency = Date.now() - startTime;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message || 'No response received',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      setLastMetadata({
        ...response.metadata,
        latency,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(null);
    setLastMetadata(null);
    setError(null);
  };

  const handleRetry = () => {
    // Clear error and allow retry
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const modelInfo = tenantQuery.data?.settings?.llm;
  const errorInfo = error ? getErrorInfo(error) : null;

  return (
    <section className="dashboard-section" style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1>Test Your Chatbot</h1>
        <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
          Have a conversation with your chatbot to see how it responds to questions.
        </p>
      </div>

      {/* Model Info Banner */}
      {tenantQuery.data && (
        <div style={{
          marginBottom: 20,
          padding: '12px 16px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: 8,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <span>Using: <strong>{modelInfo?.provider || 'ollama'}</strong> / <strong>{modelInfo?.model || 'default'}</strong></span>
          {conversationId && (
            <span style={{ color: '#64748b', fontSize: '12px' }}>
              Conversation: {conversationId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Chat Area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '550px',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            background: '#fafafa',
          }}>
            {messages.length === 0 && !error && (
              <div style={{
                textAlign: 'center',
                color: '#94a3b8',
                padding: '60px 20px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: 16 }}>💬</div>
                <p style={{ fontSize: '16px', marginBottom: 8 }}>Start a conversation</p>
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                  Type a message below to test how your chatbot responds.
                  <br />Try asking about content from your Knowledge Base!
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: msg.role === 'user' ? '#4f46e5' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#0f172a',
                    boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: 4, opacity: 0.7 }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  color: '#64748b',
                }}>
                  Thinking...
                </div>
              </div>
            )}

            {/* Enhanced Error Display */}
            {error && errorInfo && (
              <div style={{
                padding: 20,
                background: errorInfo.type === 'config' ? '#fef3c7' : '#fee2e2',
                border: `1px solid ${errorInfo.type === 'config' ? '#fcd34d' : '#fca5a5'}`,
                borderRadius: 12,
                marginBottom: 16,
              }}>
                <div style={{
                  fontWeight: 600,
                  color: errorInfo.type === 'config' ? '#92400e' : '#991b1b',
                  marginBottom: 8,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {errorInfo.type === 'config' ? '⚙️' : '⚠️'} {errorInfo.title}
                </div>
                <div style={{
                  color: errorInfo.type === 'config' ? '#78350f' : '#991b1b',
                  fontSize: '14px',
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}>
                  {errorInfo.description}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {errorInfo.actionLink && (
                    <Link
                      to={errorInfo.actionLink}
                      className="primary-button"
                      style={{
                        textDecoration: 'none',
                        fontSize: '13px',
                        padding: '8px 16px',
                      }}
                    >
                      {errorInfo.actionText}
                    </Link>
                  )}
                  <button
                    onClick={handleRetry}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      background: '#fff',
                      border: `1px solid ${errorInfo.type === 'config' ? '#fcd34d' : '#fca5a5'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => setError(null)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: 16,
            borderTop: '1px solid #e2e8f0',
            background: '#fff',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                disabled={isLoading}
                rows={2}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: '14px',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="primary-button"
                style={{ alignSelf: 'stretch', minWidth: 80 }}
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Response Metadata */}
          <div style={{
            padding: 16,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>
              Response Info
            </h3>
            {lastMetadata ? (
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                {lastMetadata.latency && <div><strong>Response time:</strong> {lastMetadata.latency}ms</div>}
                {lastMetadata.model && <div><strong>Model:</strong> {lastMetadata.model}</div>}
                {lastMetadata.tokens?.total && <div><strong>Tokens used:</strong> {lastMetadata.tokens.total}</div>}
                {lastMetadata.contextUsed !== undefined && (
                  <div><strong>Used knowledge base:</strong> {lastMetadata.contextUsed ? 'Yes' : 'No'}</div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                Send a message to see response details
              </p>
            )}
          </div>

          {/* Tips */}
          <div style={{
            padding: 16,
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 12,
            fontSize: '13px',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
              Tips
            </h3>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#78350f', lineHeight: 1.6 }}>
              <li>Test questions about your uploaded content</li>
              <li>Check if the bot follows your instructions</li>
              <li>Each message continues the same conversation</li>
            </ul>
          </div>

          {/* Actions */}
          <button
            onClick={handleClearChat}
            className="secondary-button"
            disabled={messages.length === 0 && !error && !conversationId}
            style={{ width: '100%' }}
          >
            Start New Conversation
          </button>
        </div>
      </div>
    </section>
  );
}
