import { FormEvent, useState } from 'react';

interface ComposerProps {
  disabled?: boolean;
  onSend: (value: string) => Promise<void> | void;
  placeholder?: string;
  quickReplies?: string[];
}

export function Composer({ disabled, onSend, placeholder, quickReplies = [] }: ComposerProps) {
  const [value, setValue] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    await onSend(value.trim());
    setValue('');
  };

  return (
    <form className="meta-chat-composer" onSubmit={handleSubmit}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder ?? 'Type your message...'}
        aria-label="Message"
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || value.trim().length === 0}>
        Send
      </button>
      {quickReplies.length > 0 && (
        <div className="meta-chat-quick-replies" aria-hidden>
          {quickReplies.map((reply) => (
            <button
              type="button"
              key={reply}
              onClick={() => setValue(reply)}
              disabled={disabled}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
