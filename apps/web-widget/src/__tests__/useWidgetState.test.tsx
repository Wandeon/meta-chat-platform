import { act, renderHook, waitFor } from '@testing-library/react';
import { useWidgetState } from '../hooks/useWidgetState';
import type { WidgetConfig } from '../types';

type MessageHandler = (event: MessageEvent<string>) => void;

type MaybeHandler = (() => void) | null;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: MaybeHandler = null;
  onmessage: MessageHandler | null = null;
  onclose: MaybeHandler = null;
  onerror: MaybeHandler = null;
  readonly url: string;
  readonly sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  triggerMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var WebSocket: typeof MockWebSocket;
}

const baseConfig: WidgetConfig = {
  widgetId: 'widget-123',
  apiBaseUrl: 'https://api.example.com',
  websocketUrl: 'wss://api.example.com/ws',
  tenantId: 'tenant-1',
  initialMessage: 'Hello from Meta Chat',
};

beforeEach(() => {
  MockWebSocket.instances = [];
  global.WebSocket = MockWebSocket;
  localStorage.clear();
});

describe('useWidgetState', () => {
  it('restores persisted messages on mount before connecting', async () => {
    const { result, unmount } = renderHook(() => useWidgetState({ config: baseConfig }));
    const socket = MockWebSocket.instances.at(-1);

    act(() => socket?.triggerOpen());
    act(() =>
      socket?.triggerMessage({
        type: 'message',
        id: 'server-1',
        role: 'assistant',
        content: 'Hi there',
        timestamp: '2024-01-01T00:00:00Z',
      }),
    );

    await waitFor(() =>
      expect(result.current.state.messages.find((message) => message.id === 'server-1')).toBeTruthy(),
    );

    unmount();

    const rerendered = renderHook(() => useWidgetState({ config: baseConfig }));

    await waitFor(() =>
      expect(rerendered.result.current.state.messages.find((message) => message.id === 'server-1'))
        .toBeTruthy(),
    );
  });

  it('deduplicates replayed messages after reconnecting', async () => {
    const { result } = renderHook(() => useWidgetState({ config: baseConfig }));
    const socket = MockWebSocket.instances.at(-1);

    act(() => socket?.triggerOpen());
    await waitFor(() => expect(result.current.state.connection.status).toBe('open'));

    act(() => result.current.sendMessage('User hello'));

    const pendingId = result.current.state.messages.find((message) => message.pending)?.id;
    expect(pendingId).toBeTruthy();

    act(() =>
      socket?.triggerMessage({
        type: 'message',
        id: 'server-1',
        client_message_id: pendingId,
        role: 'assistant',
        content: 'Response 1',
        timestamp: '2024-01-01T00:00:00Z',
      }),
    );

    await waitFor(() =>
      expect(
        result.current.state.messages.find(
          (message) => message.id === 'server-1' && message.pending === false,
        ),
      ).toBeTruthy(),
    );

    act(() =>
      socket?.triggerMessage({
        type: 'message',
        id: 'server-1',
        role: 'assistant',
        content: 'Response 1 (replayed)',
        timestamp: '2024-01-01T00:01:00Z',
      }),
    );

    await waitFor(() => {
      const matching = result.current.state.messages.filter((message) => message.id === 'server-1');
      expect(matching).toHaveLength(1);
      expect(matching[0].content).toBe('Response 1 (replayed)');
    });
  });
});
