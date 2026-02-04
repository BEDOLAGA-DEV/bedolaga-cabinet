import { useCallback } from 'react';
import { usePlatform } from '@/platform/hooks/usePlatform';
import type { PopupOptions, PopupButton } from '@/platform/types';

interface DialogMethods {
  /**
   * Show a simple alert dialog
   * @param message - Alert message
   * @param title - Optional title (only shown if platform supports it)
   */
  alert: (message: string, title?: string) => Promise<void>;

  /**
   * Show a confirmation dialog
   * @param message - Confirmation message
   * @param title - Optional title
   * @returns true if confirmed, false otherwise
   */
  confirm: (message: string, title?: string) => Promise<boolean>;

  /**
   * Show a popup with custom buttons
   * @param options - Popup configuration
   * @returns ID of the pressed button, or null if cancelled
   */
  popup: (options: PopupOptions) => Promise<string | null>;

  /**
   * Whether native dialogs are available
   */
  isNative: boolean;
}

/**
 * Hook to access native dialog functionality
 * Uses Telegram popups in Mini Apps, browser dialogs in web
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const dialog = useNativeDialog();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await dialog.confirm('Delete this item?');
 *     if (confirmed) {
 *       deleteItem();
 *     }
 *   };
 * }
 * ```
 */
export function useNativeDialog(): DialogMethods {
  const { dialog, capabilities } = usePlatform();

  const alert = useCallback(
    async (message: string, title?: string) => {
      await dialog.alert(message, title);
    },
    [dialog],
  );

  const confirm = useCallback(
    async (message: string, title?: string) => {
      return dialog.confirm(message, title);
    },
    [dialog],
  );

  const popup = useCallback(
    async (options: PopupOptions) => {
      return dialog.popup(options);
    },
    [dialog],
  );

  return {
    alert,
    confirm,
    popup,
    isNative: capabilities.hasNativeDialogs,
  };
}

/**
 * Helper to create popup button configurations
 */
export const PopupButtons = {
  ok: (text = 'OK'): PopupButton => ({ id: 'ok', type: 'ok', text }),
  cancel: (text = 'Cancel'): PopupButton => ({ id: 'cancel', type: 'cancel', text }),
  close: (text = 'Close'): PopupButton => ({ id: 'close', type: 'close', text }),
  destructive: (id: string, text: string): PopupButton => ({ id, type: 'destructive', text }),
  default: (id: string, text: string): PopupButton => ({ id, type: 'default', text }),
};

/**
 * Show a destructive action confirmation
 * Red "Delete" button style in Telegram
 */
export function useDestructiveConfirm() {
  const dialog = useNativeDialog();

  return useCallback(
    async (message: string, actionText = 'Delete', title?: string) => {
      if (dialog.isNative) {
        const result = await dialog.popup({
          title,
          message,
          buttons: [PopupButtons.cancel(), PopupButtons.destructive('confirm', actionText)],
        });
        return result === 'confirm';
      }
      return dialog.confirm(message, title);
    },
    [dialog],
  );
}
