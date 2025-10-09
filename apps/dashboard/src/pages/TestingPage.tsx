import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
import type { Tenant } from '../api/types';

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
  };
}

export function TestingPage() {
  const api = useApi();
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<any>(null);

  // Fetch selected tenant details
  const tenantQuery = useQuery({
    queryKey: ['tenant', selectedTenantId],
    queryFn: () => api.get<Tenant>(`/api/tenants/${selectedTenantId}`),
    enabled: !!selectedTenantId,
  });

  // Fetch tenant API key for making chat requests
  const apiKeysQuery = useQuery({
    queryKey: ['tenant-api-keys', selectedTenantId],
    queryFn: async () => {
      // This assumes there's an endpoint to get tenant API keys
      // If not, we'll need to use the admin key and pass tenantId
      return null;
    },
    enabled: !!selectedTenantId,
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedTenantId) return;

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
      // Make chat request - this will need to be adjusted based on your actual chat endpoint
      const startTime = Date.now();
      const response = await api.post<ChatResponse, any>('/api/chat', {
        message: inputMessage,
        conversationId: conversationId,
        tenantId: selectedTenantId,
      });
      const latency = Date.now() - startTime;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message || 'No response',
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
      setError(err.message || 'Failed to send message');
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <section className="dashboard-section">
      <div style={{ marginBottom: 24 }}>
        <h1>Chat Testing</h1>
        <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
          Test AI responses for different tenants in real-time
        </p>
      </div>

      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Select Tenant
        </label>
        <TenantSelector
          value={selectedTenantId}
          onChange={setSelectedTenantId}
          placeholder="Choose a tenant to test..."
        />
        {selectedTenantId && tenantQuery.data && (
          <div style={{
            marginTop: 8,
            padding: 12,
            background: '#f8fafc',
            borderRadius: 8,
            fontSize: '13px',
          }}>
            <div><strong>Provider:</strong> {(tenantQuery.data.settings as any)?.llm?.provider || 'openai'}</div>
            <div><strong>Model:</strong> {(tenantQuery.data.settings as any)?.llm?.model || 'gpt-4o'}</div>
            {conversationId && (
              <div style={{ marginTop: 4, color: '#64748b' }}>
                <strong>Conversation ID:</strong> {conversationId}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTenantId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Chat Area */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
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
              {messages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: '#94a3b8',
                  padding: '40px 20px',
                }}>
                  <p style={{ fontSize: '18px', marginBottom: 8 }}>👋 Start a conversation</p>
                  <p style={{ fontSize: '14px' }}>Type a message below to test the AI assistant</p>
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
                      maxWidth: '70%',
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
                    <div
                      style={{
                        fontSize: '11px',
                        marginTop: 4,
                        opacity: 0.7,
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: 16,
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      <span className="dot">●</span>
                      <span className="dot">●</span>
                      <span className="dot">●</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  padding: 12,
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: 8,
                  color: '#991b1b',
                  fontSize: '14px',
                  marginBottom: 16,
                }}>
                  <strong>Error:</strong> {error}
                </div>
              )}
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
                  placeholder="Type your message... (Shift+Enter for new line)"
                  disabled={isLoading}
                  rows={3}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="primary-button"
                    style={{ height: '100%', minWidth: 80 }}
                  >
                    {isLoading ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: 16,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
                Response Metadata
              </h3>
              {lastMetadata ? (
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  {lastMetadata.model && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Model:</strong> {lastMetadata.model}
                    </div>
                  )}
                  {lastMetadata.latency && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Latency:</strong> {lastMetadata.latency}ms
                    </div>
                  )}
                  {lastMetadata.tokens && (
                    <div style={{ marginBottom: 8 }}>
                      <strong>Tokens:</strong>
                      <div style={{ marginLeft: 12, marginTop: 4 }}>
                        {lastMetadata.tokens.prompt && <div>Prompt: {lastMetadata.tokens.prompt}</div>}
                        {lastMetadata.tokens.completion && <div>Completion: {lastMetadata.tokens.completion}</div>}
                        {lastMetadata.tokens.total && <div>Total: {lastMetadata.tokens.total}</div>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                  Send a message to see response metadata
                </p>
              )}
            </div>

            <div style={{
              padding: 16,
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: 12,
              fontSize: '13px',
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
                💡 Tips
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#78350f' }}>
                <li>Each message continues the conversation</li>
                <li>Press Enter to send, Shift+Enter for new line</li>
                <li>Clear chat to start fresh</li>
                <li>Check metadata for token usage</li>
              </ul>
            </div>

            <button
              onClick={handleClearChat}
              className="secondary-button"
              disabled={messages.length === 0}
            >
              Clear Chat
            </button>
          </div>
        </div>
      )}

      {!selectedTenantId && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#94a3b8',
        }}>
          <p style={{ fontSize: '16px' }}>Select a tenant above to start testing</p>
        </div>
      )}
    </section>
  );
}
