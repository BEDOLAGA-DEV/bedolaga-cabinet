import { useEffect, useRef } from 'react';
import { useWebSocketContext } from '../providers/useWebSocketContext';
import { WSMessage } from '../providers/WebSocketProvider';

// Re-export WSMessage type for convenience
export type { WSMessage };

interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { isConnected, subscribe } = useWebSocketContext();
  const optionsRef = useRef(options);
  const wasConnectedRef = useRef(false);

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Handle connection state changes
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      wasConnectedRef.current = true;
      optionsRef.current.onConnect?.();
    } else if (!isConnected && wasConnectedRef.current) {
      wasConnectedRef.current = false;
      optionsRef.current.onDisconnect?.();
    }
  }, [isConnected]);

  // Subscribe to messages
  useEffect(() => {
    if (!optionsRef.current.onMessage) {
      return;
    }

    const handler = (message: WSMessage) => {
      optionsRef.current.onMessage?.(message);
    };

    const unsubscribe = subscribe(handler);
    return unsubscribe;
  }, [subscribe]);

  return { isConnected };
}
