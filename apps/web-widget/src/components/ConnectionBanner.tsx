import type { ConnectionState } from '../types';

interface ConnectionBannerProps {
  connection: ConnectionState;
}

export function ConnectionBanner({ connection }: ConnectionBannerProps) {
  if (connection.status === 'open' || connection.status === 'idle') {
    return null;
  }

  const messageMap: Record<ConnectionState['status'], string> = {
    idle: 'Connecting…',
    connecting: 'Connecting…',
    open: 'Connected',
    closed: 'Reconnecting…',
    error: connection.error ? `Connection lost: ${connection.error}` : 'Connection lost',
  };

  return <div className="meta-chat-connection-banner">{messageMap[connection.status]}</div>;
}
