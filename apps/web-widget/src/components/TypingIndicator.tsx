interface TypingIndicatorProps {
  isTyping: boolean;
  agentName?: string;
}

export function TypingIndicator({ isTyping, agentName }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="meta-chat-typing" role="status" aria-live="polite">
      <span className="meta-chat-dot" />
      <span className="meta-chat-dot" />
      <span className="meta-chat-dot" />
      <span>{agentName ? `${agentName} is typing…` : 'Typing…'}</span>
    </div>
  );
}
