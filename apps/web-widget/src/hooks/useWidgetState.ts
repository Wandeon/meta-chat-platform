import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ChatMessage, ConnectionState, WidgetConfig, WidgetEvent, WidgetState } from '../types';

interface UseWidgetStateOptions {
  config?: WidgetConfig;
  token?: string;
  onEvent?: (event: WidgetEvent) => void;
}

const initialState: WidgetState = {
  config: undefined,
  messages: [],
  connection: { status: 'idle', retryCount: 0 },
  isTyping: false,
};

type Action =
  | { type: 'config'; config: WidgetConfig }
  | { type: 'messages'; update: (messages: ChatMessage[]) => ChatMessage[] }
  | { type: 'connection'; connection: ConnectionState }
  | { type: 'typing'; value: boolean };

function widgetReducer(state: WidgetState, action: Action): WidgetState {
  switch (action.type) {
    case 'config':
      return { ...state, config: action.config };
    case 'messages':
      return { ...state, messages: action.update(state.messages) };
    case 'connection':
      return { ...state, connection: action.connection };
    case 'typing':
      return { ...state, isTyping: action.value };
    default:
      return state;
  }
}

const MAX_RETRIES = 5;

export function useWidgetState({ config, token, onEvent }: UseWidgetStateOptions) {
  const [state, dispatch] = useReducer(widgetReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    if (!config) return;
    const url = new URL(config.websocketUrl);
    if (token) {
      url.searchParams.set('token', token);
    }
    if (config.widgetId) {
      url.searchParams.set('widgetId', config.widgetId);
    }
    dispatch({
      type: 'connection',
      connection: { status: 'connecting', retryCount: retryCount.current },
    });
    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      dispatch({ type: 'connection', connection: { status: 'open', retryCount: 0 } });
      onEvent?.({ type: 'connection-state', state: { status: 'open', retryCount: 0 } });
      if (config.initialMessage) {
        const message: ChatMessage = {
          id: `initial-${Date.now()}`,
          role: 'system',
          content: config.initialMessage,
          timestamp: new Date().toISOString(),
        };
        dispatch({ type: 'messages', update: (messages) => [message, ...messages] });
      }
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'message') {
          const message: ChatMessage = {
            id: payload.id ?? `server-${Date.now()}`,
            role: payload.role ?? 'assistant',
            content: payload.content,
            timestamp: payload.timestamp ?? new Date().toISOString(),
            pending: false,
          };
          dispatch({ type: 'messages', update: (messages) => [...messages, message] });
          onEvent?.({ type: 'message-received', message });
        } else if (payload.type === 'typing') {
          dispatch({ type: 'typing', value: Boolean(payload.isTyping) });
          onEvent?.({ type: 'typing', isTyping: Boolean(payload.isTyping) });
        }
      } catch (error) {
        console.warn('[MetaChat] Failed to parse message', error);
      }
    };

    ws.onclose = () => {
      if (retryCount.current >= MAX_RETRIES) {
        dispatch({
          type: 'connection',
          connection: {
            status: 'error',
            retryCount: retryCount.current,
            error: 'Unable to establish connection',
          },
        });
        return;
      }
      dispatch({
        type: 'connection',
        connection: { status: 'closed', retryCount: retryCount.current },
      });
      retryTimeout.current = setTimeout(() => {
        retryCount.current += 1;
        connect();
      }, Math.min(1000 * 2 ** retryCount.current, 30_000));
    };

    ws.onerror = () => {
      dispatch({
        type: 'connection',
        connection: { status: 'error', retryCount: retryCount.current, error: 'Network error' },
      });
    };
  }, [config, onEvent, token]);

  useEffect(() => {
    if (!config) return undefined;
    dispatch({ type: 'config', config });
    onEvent?.({ type: 'config-loaded', config });
    connect();
    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
      wsRef.current?.close();
    };
  }, [config, connect, onEvent]);

  const sendMessage = useCallback(
    (content: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('Connection not ready');
      }
      const message: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        pending: true,
      };
      ws.send(
        JSON.stringify({
          type: 'message',
          content,
          metadata: config?.metadata ?? {},
        }),
      );
      dispatch({ type: 'messages', update: (messages) => [...messages, message] });
      onEvent?.({ type: 'message-sent', message });
    },
    [config?.metadata, onEvent],
  );

  return useMemo(
    () => ({
      state,
      sendMessage,
    }),
    [sendMessage, state],
  );
}
