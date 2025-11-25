import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { useAuth } from '../routes/AuthProvider';
import DOMPurify from 'dompurify';
import { Link } from 'react-router-dom';

interface Conversation {
  id: string;
  tenantId: string;
  channelType: string;
  externalId: string;
  userId: string;
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  type: string;
  content: { text?: string } | any;
  metadata: Record<string, any>;
  timestamp: string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export function ConversationsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { getUser } = useAuth();
  const user = getUser();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch all conversations
  const conversationsQuery = useQuery({
    queryKey: ['conversations', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return api.get<Conversation[]>(`/api/conversations${params}`);
    },
  });

  // Fetch channels to check deployment status
  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<{ type: string; enabled?: boolean }[]>('/api/channels'),
  });

  // Fetch selected conversation with messages
  const conversationDetailQuery = useQuery({
    queryKey: ['conversation', selectedConversation],
    queryFn: () => api.get<ConversationWithMessages>(`/api/conversations/${selectedConversation}`),
    enabled: !!selectedConversation,
  });

  // Update conversation status mutation
  const updateConversation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/conversations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversation] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#d1fae5', color: '#065f46' };
      case 'assigned_human':
        return { bg: '#fef3c7', color: '#92400e' };
      case 'closed':
        return { bg: '#f1f5f9', color: '#475569' };
      default:
        return { bg: '#e0e7ff', color: '#3730a3' };
    }
  };

  const handleMarkAsResolved = (conversationId: string) => {
    if (confirm('Mark this conversation as resolved and close it?')) {
      updateConversation.mutate({ id: conversationId, status: 'closed' });
      setSelectedConversation(null);
    }
  };

  const handoffConversations =
    conversationsQuery.data?.filter((c) => c.status === 'assigned_human') || [];
  const activeConversations =
    conversationsQuery.data?.filter((c) => c.status === 'active') || [];

  // Check if any channel is deployed
  const hasDeployedChannel = channelsQuery.data?.some(c => c.enabled);

  // Empty state with helpful guidance
  const renderEmptyState = () => {
    if (!hasDeployedChannel) {
      return (
        <div style={{ 
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
          border: '1px solid #bae6fd', 
          borderRadius: '12px', 
          padding: '48px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
          <h2 style={{ margin: '0 0 12px 0', color: '#0369a1' }}>Deploy Your Chatbot First</h2>
          <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Conversations will appear here once visitors start chatting with your bot. 
            Deploy your chatbot to a channel to start receiving conversations.
          </p>
          <Link 
            to="/deploy" 
            className="primary-button"
            style={{ textDecoration: 'none' }}
          >
            Go to Deploy
          </Link>
        </div>
      );
    }

    return (
      <div style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '12px', 
        padding: '48px', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <h2 style={{ margin: '0 0 12px 0', color: '#334155' }}>No Conversations Yet</h2>
        <p style={{ color: '#64748b', marginBottom: '16px', maxWidth: '450px', margin: '0 auto 16px' }}>
          Your chatbot is deployed and ready! Conversations will appear here 
          when visitors start chatting on your connected channels.
        </p>
        <div style={{ 
          background: '#fff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px', 
          display: 'inline-block',
          textAlign: 'left'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            Tips to get started:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '13px' }}>
            <li>Test your chatbot on the <Link to="/test" style={{ color: '#4f46e5' }}>Test page</Link></li>
            <li>Share your website link with the widget installed</li>
            <li>Conversations sync in real-time</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <section className="dashboard-section">
      <h1>Conversations</h1>
      <p style={{ margin: '8px 0 24px 0', color: '#64748b' }}>
        Monitor active conversations and respond to human handoff requests
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            Needs Human Attention
          </h3>
          <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 700, color: '#f59e0b' }}>
            {handoffConversations.length}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            Active (AI Handling)
          </h3>
          <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 700, color: '#10b981' }}>
            {activeConversations.length}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            Total Conversations
          </h3>
          <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 700, color: '#3b82f6' }}>
            {conversationsQuery.data?.length || 0}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {['all', 'assigned_human', 'active', 'closed'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={statusFilter === filter ? 'primary-button' : 'secondary-button'}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {filter === 'all' ? 'All' : 
             filter === 'assigned_human' ? 'Needs Human' :
             filter === 'active' ? 'Active' : 'Closed'}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      {conversationsQuery.isLoading ? (
        <p>Loading conversations...</p>
      ) : conversationsQuery.error ? (
        <p style={{ color: '#dc2626' }}>Error: {conversationsQuery.error.message}</p>
      ) : conversationsQuery.data && conversationsQuery.data.length === 0 ? (
        renderEmptyState()
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>User</th>
              <th>Status</th>
              <th>Handoff Reason</th>
              <th>Last Message</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {conversationsQuery.data?.map((conversation) => {
              const statusStyle = getStatusColor(conversation.status);
              const metadata = conversation.metadata || {};
              const handoffReason = metadata.handoffReason || '-';
              const triggeredKeyword = metadata.triggeredKeyword || '';

              return (
                <tr key={conversation.id}>
                  <td>
                    <span style={{
                      fontSize: '13px',
                      padding: '2px 8px',
                      background: '#f1f5f9',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}>
                      {conversation.channelType}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                    {conversation.userId.slice(0, 12)}...
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      {conversation.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {handoffReason !== '-' && (
                      <span>
                        {handoffReason}
                        {triggeredKeyword && (
                          <code style={{
                            marginLeft: '6px',
                            background: '#fef3c7',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#92400e',
                          }}>
                            "{triggeredKeyword}"
                          </code>
                        )}
                      </span>
                    )}
                    {handoffReason === '-' && '-'}
                  </td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>
                    {new Date(conversation.lastMessageAt).toLocaleString()}
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedConversation(conversation.id)}
                      className="secondary-button"
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Conversation Detail Modal */}
      {selectedConversation && (
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
            padding: '0',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Conversation Details
                </h2>
                <button
                  onClick={() => setSelectedConversation(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  ×
                </button>
              </div>
              {conversationDetailQuery.data && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b' }}>
                  <span>Channel: <strong>{conversationDetailQuery.data.channelType}</strong></span>
                  <span>•</span>
                  <span>Status: <strong style={{ color: getStatusColor(conversationDetailQuery.data.status).color }}>
                    {conversationDetailQuery.data.status}
                  </strong></span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f8fafc' }}>
              {conversationDetailQuery.isLoading ? (
                <p>Loading messages...</p>
              ) : conversationDetailQuery.error ? (
                <p style={{ color: '#dc2626' }}>Error loading messages</p>
              ) : conversationDetailQuery.data?.messages && conversationDetailQuery.data.messages.length === 0 ? (
                <p style={{ color: '#64748b' }}>No messages yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {conversationDetailQuery.data?.messages.map((message) => {
                    const isUser = message.direction === 'inbound';
                    const messageText = typeof message.content === 'object'
                      ? (message.content.text || JSON.stringify(message.content))
                      : String(message.content);
                    const isHandoffMessage = message.metadata?.humanHandoffTriggered;

                    const sanitizedMessageText = DOMPurify.sanitize(messageText, {
                      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
                      ALLOWED_ATTR: ['href', 'target', 'rel']
                    });

                    return (
                      <div
                        key={message.id}
                        style={{
                          display: 'flex',
                          justifyContent: isUser ? 'flex-start' : 'flex-end',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: isUser ? '#fff' : isHandoffMessage ? '#fef3c7' : '#e0e7ff',
                            border: isUser ? '1px solid #e2e8f0' : 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                            {isUser ? 'User' : message.from === 'system' ? 'System' : 'AI Assistant'}
                          </div>
                          <div
                            style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: sanitizedMessageText }}
                          />
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                            {new Date(message.timestamp).toLocaleString()}
                          </div>
                          {isHandoffMessage && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '11px',
                              color: '#92400e',
                              background: '#fef9c3',
                              padding: '4px 8px',
                              borderRadius: '4px',
                            }}>
                              Human handoff triggered: "{DOMPurify.sanitize(message.metadata.triggeredKeyword)}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            {conversationDetailQuery.data?.status === 'assigned_human' && (
              <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', background: '#fef3c7' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#92400e', fontWeight: 500 }}>
                  This conversation needs human attention
                </p>
                <button
                  onClick={() => handleMarkAsResolved(selectedConversation)}
                  disabled={updateConversation.isPending}
                  className="primary-button"
                  style={{ fontSize: '14px' }}
                >
                  {updateConversation.isPending ? 'Updating...' : 'Mark as Resolved & Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
