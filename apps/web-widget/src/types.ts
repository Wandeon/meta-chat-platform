export interface WidgetThemeConfig {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  showBranding?: boolean;
}

export interface WidgetConfig {
  widgetId: string;
  apiBaseUrl: string;
  websocketUrl: string;
  tenantId: string;
  initialMessage?: string;
  theme?: WidgetThemeConfig;
  metadata?: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  pending?: boolean;
  clientMessageId?: string;
}

export interface WidgetOptions {
  element?: HTMLElement | null;
  configUrl?: string;
  config?: Partial<WidgetConfig>;
  token?: string;
  onEvent?: (event: WidgetEvent) => void;
}

export interface ConnectionState {
  status: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
  error?: string;
  retryCount: number;
}

export interface WidgetState {
  config?: WidgetConfig;
  messages: ChatMessage[];
  connection: ConnectionState;
  isTyping: boolean;
}

export type WidgetEvent =
  | { type: 'config-loaded'; config: WidgetConfig }
  | { type: 'message-received'; message: ChatMessage }
  | { type: 'message-sent'; message: ChatMessage }
  | { type: 'connection-state'; state: ConnectionState }
  | { type: 'typing'; isTyping: boolean };
