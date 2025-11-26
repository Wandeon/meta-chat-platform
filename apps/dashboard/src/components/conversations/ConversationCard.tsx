import { useTranslation } from 'react-i18next';
import { MessageSquare, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConversationCardProps {
  conversation: {
    id: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    messageCount?: number;
    lastMessage?: string;
    status?: string;
  };
  onClick: (id: string) => void;
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const { t } = useTranslation();

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={() => onClick(conversation.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {conversation.id.slice(0, 8)}...
            </span>
          </div>
          <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
            {conversation.status || 'active'}
          </Badge>
        </div>

        {conversation.lastMessage && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {conversation.lastMessage}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(conversation.updatedAt)}</span>
          </div>
          {conversation.messageCount && (
            <span>
              {conversation.messageCount} {t('conversations.messages')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
