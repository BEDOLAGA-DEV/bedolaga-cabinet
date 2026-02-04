import { useCallback } from 'react';
import { useTelegramSDK } from './useTelegramSDK';

/**
 * Hook for drag-and-drop operations in Telegram Mini App.
 * Note: Vertical swipes are now globally disabled at app init,
 * so this hook just provides no-op callbacks for compatibility.
 */
export function useTelegramDnd() {
  const { isTelegramWebApp } = useTelegramSDK();

  const onDragStart = useCallback(() => {
    // No-op: swipes are globally disabled
  }, []);

  const onDragEnd = useCallback(() => {
    // No-op: swipes are globally disabled
  }, []);

  const onDragCancel = useCallback(() => {
    // No-op: swipes are globally disabled
  }, []);

  return {
    onDragStart,
    onDragEnd,
    onDragCancel,
    isTelegramWebApp,
  };
}
