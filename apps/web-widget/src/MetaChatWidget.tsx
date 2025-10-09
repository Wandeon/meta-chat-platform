import { useMemo, type CSSProperties } from 'react';
import { Composer } from './components/Composer';
import { MessageList } from './components/MessageList';
import { TypingIndicator } from './components/TypingIndicator';
import { useWidgetState } from './hooks/useWidgetState';
import type { WidgetConfig, WidgetEvent, WidgetOptions } from './types';
import { ConnectionBanner } from './components/ConnectionBanner';
import { useThemeStyles } from './hooks/useThemeStyles';
import './styles/widget.css';

interface MetaChatWidgetProps extends WidgetOptions {
  config: WidgetConfig;
  onEvent?: (event: WidgetEvent) => void;
}

export function MetaChatWidget({ config, token, onEvent }: MetaChatWidgetProps) {
  const { state, sendMessage } = useWidgetState({ config, token, onEvent });
  const themeStyles = useThemeStyles(config);

  const brandLabel = useMemo(() => config.metadata?.brandName ?? 'Meta Chat', [config.metadata]);

  return (
    <div className="meta-chat-container" role="complementary" style={themeStyles as CSSProperties}>
      <ConnectionBanner connection={state.connection} />
      <header className="meta-chat-header">
        <div>
          <h3>{brandLabel}</h3>
          <small>We typically reply instantly.</small>
        </div>
        {config.theme?.showBranding !== false && <small>Powered by Meta Chat</small>}
      </header>
      <MessageList messages={state.messages} />
      <TypingIndicator isTyping={state.isTyping} agentName={config.metadata?.agentName} />
      <Composer
        disabled={state.connection.status !== 'open'}
        onSend={async (value) => {
          try {
            await sendMessage(value);
          } catch (error) {
            console.error('[MetaChat] Failed to send message', error);
          }
        }}
        placeholder={config.metadata?.composerPlaceholder}
        quickReplies={config.metadata?.quickReplies?.split?.('|') ?? []}
      />
    </div>
  );
}
