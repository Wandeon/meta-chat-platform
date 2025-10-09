import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface ConversationSummary {
  id: string;
  tenantId: string;
  channelId: string;
  lastMessageAt: string;
  participants: string[];
  status: 'open' | 'closed' | 'escalated';
}

interface ConversationTranscript {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export function ConversationsPage() {
  const api = useApi();

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<ConversationSummary[]>('/conversations'),
  });

  const transcriptQuery = useQuery({
    queryKey: ['transcripts'],
    queryFn: () => api.get<ConversationTranscript[]>('/conversations/recent'),
  });

  return (
    <section className="dashboard-section">
      <h1>Conversations</h1>
      <p>Monitor active conversations and audit recent transcripts.</p>

      <div className="form-grid" style={{ marginBottom: 32 }}>
        <div>
          <h3>Open conversations</h3>
          <p style={{ fontSize: '2.5rem', margin: 0 }}>
            {conversationsQuery.data?.filter((item) => item.status === 'open').length ?? '–'}
          </p>
        </div>
        <div>
          <h3>Escalated</h3>
          <p style={{ fontSize: '2.5rem', margin: 0 }}>
            {conversationsQuery.data?.filter((item) => item.status === 'escalated').length ?? '–'}
          </p>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tenant</th>
            <th>Channel</th>
            <th>Participants</th>
            <th>Status</th>
            <th>Last message</th>
          </tr>
        </thead>
        <tbody>
          {conversationsQuery.data?.map((conversation) => (
            <tr key={conversation.id}>
              <td>{conversation.id}</td>
              <td>{conversation.tenantId}</td>
              <td>{conversation.channelId}</td>
              <td>{conversation.participants.join(', ')}</td>
              <td>{conversation.status}</td>
              <td>{new Date(conversation.lastMessageAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 32 }}>
        <h2>Recent transcripts</h2>
        <div style={{ display: 'grid', gap: 16 }}>
          {transcriptQuery.data?.map((entry) => (
            <article
              key={`${entry.id}-${entry.createdAt}`}
              style={{
                background: '#f1f5f9',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'grid',
                gap: 6,
              }}
            >
              <header style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>{entry.role}</span>
                <time>{new Date(entry.createdAt).toLocaleString()}</time>
              </header>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{entry.content}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
