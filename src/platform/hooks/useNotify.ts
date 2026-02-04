import { useCallback } from 'react';
import { usePlatform } from '@/platform/hooks/usePlatform';
import { useToast } from '@/components/Toast';

type NotifyType = 'success' | 'error' | 'warning' | 'info';

interface NotifyOptions {
  type?: NotifyType;
  title?: string;
  message: string;
  duration?: number;
}

/**
 * Universal notification hook.
 * - In Telegram Mini App: uses native showPopup
 * - In browser: uses Toast component
 *
 * @example
 * ```tsx
 * const notify = useNotify();
 *
 * // Warning notification
 * notify.warning('Cannot delete: has active subscriptions');
 *
 * // Success notification
 * notify.success('Tariff created successfully');
 *
 * // With title
 * notify({ type: 'error', title: 'Error', message: 'Something went wrong' });
 * ```
 */
export function useNotify() {
  const { dialog, capabilities } = usePlatform();
  const { showToast } = useToast();

  const notify = useCallback(
    (options: NotifyOptions | string) => {
      const opts: NotifyOptions = typeof options === 'string' ? { message: options } : options;

      const { type = 'info', title, message, duration } = opts;

      // In Telegram - use native popup for important messages
      if (capabilities.hasNativeDialogs) {
        dialog.popup({
          title: title,
          message: message,
          buttons: [{ id: 'ok', type: 'ok', text: 'OK' }],
        });
        return;
      }

      // In browser - use Toast
      showToast({
        type,
        title,
        message,
        duration: duration ?? (type === 'error' ? 7000 : 5000),
      });
    },
    [capabilities.hasNativeDialogs, dialog, showToast],
  );

  // Shorthand methods
  const success = useCallback(
    (message: string, title?: string) => notify({ type: 'success', message, title }),
    [notify],
  );

  const error = useCallback(
    (message: string, title?: string) => notify({ type: 'error', message, title }),
    [notify],
  );

  const warning = useCallback(
    (message: string, title?: string) => notify({ type: 'warning', message, title }),
    [notify],
  );

  const info = useCallback(
    (message: string, title?: string) => notify({ type: 'info', message, title }),
    [notify],
  );

  return {
    notify,
    success,
    error,
    warning,
    info,
  };
}
