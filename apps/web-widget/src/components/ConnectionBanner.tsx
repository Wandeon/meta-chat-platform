import type { ConnectionState } from '../types';

interface ConnectionBannerProps {
  connection: ConnectionState;
}

export function ConnectionBanner({ connection }: ConnectionBannerProps) {
  if (connection.status === 'open' || connection.status === 'idle') {
    return null;
  }

  const getStatusMessage = () => {
    switch (connection.status) {
      case 'connecting':
        return 'Connecting…';
      case 'closed':
        const retryText = connection.retryCount > 0 ? ` (Attempt ${connection.retryCount + 1})` : '';
        const timeText = connection.nextRetryTime ? ` Next retry in ${connection.nextRetryTime}s` : '';
        return `Reconnecting…${retryText}${timeText}`;
      case 'error':
        return connection.error ? `Connection lost: ${connection.error}` : 'Connection lost';
      default:
        return 'Connecting…';
    }
  };

  const getStatusIcon = () => {
    switch (connection.status) {
      case 'connecting':
        return '🔄';
      case 'closed':
        return '🔄';
      case 'error':
        return '⚠️';
      default:
        return '🔄';
    }
  };

  return (
    <div
      className={`meta-chat-connection-banner meta-chat-connection-${connection.status}`}
      role="status"
      aria-live="polite"
    >
      <span className="meta-chat-connection-icon">{getStatusIcon()}</span>
      <span className="meta-chat-connection-message">{getStatusMessage()}</span>
    </div>
  );
}
