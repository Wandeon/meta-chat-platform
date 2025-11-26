import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Search } from 'lucide-react';
import { useApi } from '../api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConversationCard } from '@/components/conversations/ConversationCard';

export function ConversationsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [search, setSearch] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<any[]>('/api/conversations'),
  });

  const handleConversationClick = (id: string) => {
    // TODO: Navigate to conversation detail or open modal
  };

  const conversations = conversationsQuery.data || [];
  const filteredConversations = conversations.filter(conv => {
    if (filter !== 'all' && conv.status !== filter) return false;
    if (search && !conv.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t('conversations.title')}
        </h1>
        <p className="text-muted-foreground">{t('conversations.subtitle')}</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            {t('conversations.filterAll')}
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
          >
            {t('conversations.filterActive')}
          </Button>
          <Button
            variant={filter === 'resolved' ? 'default' : 'outline'}
            onClick={() => setFilter('resolved')}
          >
            {t('conversations.filterResolved')}
          </Button>
        </div>

        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('conversations.searchPlaceholder')}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      {conversationsQuery.isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="flex justify-between items-start mb-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </Card>
          ))}
        </div>
      ) : filteredConversations.length > 0 ? (
        <div className="grid gap-4">
          {filteredConversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onClick={handleConversationClick}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center h-64">
          <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('conversations.noConversations')}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {t('conversations.noConversationsDescription')}
          </p>
        </Card>
      )}
    </div>
  );
}
