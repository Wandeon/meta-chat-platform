import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatMessage } from '@/components/testing/ChatMessage';
import { ChatInput } from '@/components/testing/ChatInput';
import { MetadataSidebar } from '@/components/testing/MetadataSidebar';
import type { Tenant } from '../api/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  conversationId?: string;
  metadata?: any;
}

export function TestingPage() {
  const { t } = useTranslation();
  const api = useApi();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<any>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!selectedTenantId) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const response = await api.post<ChatResponse, any>('/api/chat', {
        message: content,
        conversationId,
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setLastMetadata(null);
    setError(null);
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('testing.title')}
          </h1>
          <p className="text-muted-foreground mb-4">{t('testing.subtitle')}</p>

          <div className="flex gap-2 items-center">
            <div className="flex-1 max-w-xs">
              <TenantSelector
                value={selectedTenantId}
                onChange={setSelectedTenantId}
              />
            </div>
            {messages.length > 0 && (
              <Button variant="outline" onClick={handleNewConversation}>
                {t('testing.newConversation')}
              </Button>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        {!selectedTenantId ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('testing.selectTenant')}</p>
            </div>
          </Card>
        ) : messages.length === 0 ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('testing.startConversation')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('testing.typeMessage')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('testing.tryExample')}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} {...msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input Area */}
        <div className="mt-4">
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            disabled={!selectedTenantId}
          />
        </div>
      </div>

      {/* Metadata Sidebar (Desktop Only) */}
      <MetadataSidebar metadata={lastMetadata} />
    </div>
  );
}
