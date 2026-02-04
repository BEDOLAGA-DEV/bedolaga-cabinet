import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { WebSocketContext, type MessageHandler, type WSMessage } from './WebSocketContext';

// Re-export for backward compatibility
export type { WSMessage } from './WebSocketContext';

const isDev = import.meta.env.DEV;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

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

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;

    // Handle VITE_API_URL - can be absolute URL or relative path
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
      try {
        host = new URL(apiUrl).host;
      } catch {
        // If URL parsing fails, use window.location.host
      }
    }

    const wsUrl = `${protocol}//${host}/cabinet/ws?token=${accessToken}`;

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
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;

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

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
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
  }, [accessToken, isAuthenticated, cleanup]);

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
