import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { WebSocketContext, type MessageHandler, type WSMessage } from './WebSocketContext';
import { WS } from '../config/constants';

// Re-export for backward compatibility
export type { WSMessage } from './WebSocketContext';

const isDev = import.meta.env.DEV;

function buildWebSocketUrl(accessToken: string): string {
  const apiUrl = String(import.meta.env.VITE_API_URL || '/api').trim();
  const windowWsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  const withToken = (base: string) => `${base}?token=${encodeURIComponent(accessToken)}`;

  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    try {
      const api = new URL(apiUrl);
      const wsProtocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
      const basePath = api.pathname.replace(/\/+$/, '');
      const wsPath = basePath.endsWith('/cabinet') ? `${basePath}/ws` : `${basePath}/cabinet/ws`;
      return withToken(`${wsProtocol}//${api.host}${wsPath}`);
    } catch {
      // fall through to relative-path handling
    }
  }

  const normalizedBasePath = `/${apiUrl}`.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  const wsPath = normalizedBasePath.endsWith('/cabinet')
    ? `${normalizedBasePath}/ws`
    : `${normalizedBasePath}/cabinet/ws`;
  return withToken(`${windowWsProtocol}//${window.location.host}${wsPath}`);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = WS.MAX_RECONNECT_ATTEMPTS;

  // Store message handlers
  const handlersRef = useRef<Set<MessageHandler>>(new Set());

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!accessToken || !isAuthenticated) {
      return;
    }

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();

    const wsUrl = buildWebSocketUrl(accessToken);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDev) console.log('[WS] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Setup ping interval (every 25 seconds)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, WS.PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
            if (isDev) console.warn('[WS] Invalid message format:', parsed);
            return;
          }
          const message = parsed as WSMessage;

          // Ignore pong messages
          if (message.type === 'pong' || message.type === 'connected') {
            return;
          }

          // Notify all subscribers
          handlersRef.current.forEach((handler) => {
            try {
              handler(message);
            } catch (e) {
              if (isDev) console.error('[WS] Handler error:', e);
            }
          });
        } catch (e) {
          if (isDev) console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onclose = (event) => {
        if (isDev) console.log('[WS] Disconnected:', event.code, event.reason);
        setIsConnected(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Don't reconnect on auth failures (1008 = Policy Violation / invalid token)
        if (event.code === 1008) {
          if (isDev) console.log('[WS] Auth rejected, not reconnecting');
          return;
        }

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            WS.MAX_RECONNECT_DELAY_MS,
          );
          if (isDev)
            console.log(
              `[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`,
            );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        if (isDev) console.error('[WS] Error:', error);
      };
    } catch (e) {
      if (isDev) console.error('[WS] Failed to connect:', e);
    }
  }, [accessToken, isAuthenticated, cleanup, maxReconnectAttempts]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      cleanup();
      setIsConnected(false);
    }

    return cleanup;
  }, [isAuthenticated, accessToken, connect, cleanup]);

  // Subscribe function for components
  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}
