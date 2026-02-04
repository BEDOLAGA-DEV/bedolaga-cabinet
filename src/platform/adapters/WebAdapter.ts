import type {
  PlatformContext,
  PlatformCapabilities,
  BackButtonController,
  HapticController,
  DialogController,
  ThemeController,
  CloudStorageController,
  PopupOptions,
  InvoiceStatus,
  HapticImpactStyle,
  HapticNotificationType,
} from '@/platform/types';

// Storage key for local storage fallback
const STORAGE_PREFIX = 'bedolaga_';

function createCapabilities(): PlatformCapabilities {
  return {
    hasBackButton: false, // No native back button in web

    hasHapticFeedback: 'vibrate' in navigator, // Web Vibration API
    hasNativeDialogs: false, // Use custom dialogs
    hasThemeSync: false, // No header/bottom bar sync in web
    hasInvoice: false, // No native invoice in web
    hasCloudStorage: true, // Use localStorage
    hasShare: 'share' in navigator, // Web Share API
    version: undefined,
  };
}

function createBackButtonController(): BackButtonController {
  // Web doesn't have a native back button - this is a no-op
  // The UI will render its own back buttons
  return {
    isVisible: false,

    show(_onClick: () => void) {
      // No-op in web - handled by UI components
    },

    hide() {
      // No-op in web
    },
  };
}

function createHapticController(): HapticController {
  // Web Vibration API fallback (works on mobile browsers)
  const canVibrate = 'vibrate' in navigator;

  const vibrationPatterns: Record<HapticImpactStyle, number[]> = {
    light: [10],
    medium: [20],
    heavy: [30],
    rigid: [15, 10, 15],
    soft: [5, 5, 5],
  };

  const notificationPatterns: Record<HapticNotificationType, number[]> = {
    success: [10, 50, 10],
    warning: [20, 50, 20],
    error: [30, 30, 30, 30, 30],
  };

  return {
    impact(style: HapticImpactStyle = 'medium') {
      if (canVibrate) {
        navigator.vibrate(vibrationPatterns[style]);
      }
    },

    notification(type: HapticNotificationType) {
      if (canVibrate) {
        navigator.vibrate(notificationPatterns[type]);
      }
    },

    selection() {
      if (canVibrate) {
        navigator.vibrate(5);
      }
    },
  };
}

function createDialogController(): DialogController {
  // Web uses native browser dialogs as fallback
  // UI components can override with custom modals
  return {
    alert(message: string, _title?: string): Promise<void> {
      return new Promise((resolve) => {
        window.alert(message);
        resolve();
      });
    },

    confirm(message: string, _title?: string): Promise<boolean> {
      return new Promise((resolve) => {
        resolve(window.confirm(message));
      });
    },

    popup(options: PopupOptions): Promise<string | null> {
      return new Promise((resolve) => {
        // Simple confirm fallback
        const confirmed = window.confirm(options.message);
        if (confirmed && options.buttons?.length) {
          // Return first non-cancel button id
          const button = options.buttons.find((b) => b.type !== 'cancel' && b.type !== 'close');
          resolve(button?.id ?? 'ok');
        } else {
          resolve(null);
        }
      });
    },
  };
}

function createThemeController(): ThemeController {
  // Web doesn't have native theme sync
  // These are no-ops; theme is handled via CSS
  return {
    setHeaderColor(_color: string) {
      // Could update meta theme-color tag if needed
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', _color);
      }
    },

    setBottomBarColor(_color: string) {
      // No-op in web - no bottom bar to sync
    },

    getThemeParams() {
      return null;
    },
  };
}

function createCloudStorageController(): CloudStorageController {
  // Use localStorage as cloud storage fallback
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return localStorage.getItem(STORAGE_PREFIX + key);
      } catch {
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, value);
      } catch {
        // Storage might be full or disabled
        console.warn('Failed to save to localStorage:', key);
      }
    },

    async removeItem(key: string): Promise<void> {
      try {
        localStorage.removeItem(STORAGE_PREFIX + key);
      } catch {
        // Ignore errors
      }
    },

    async getKeys(): Promise<string[]> {
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(STORAGE_PREFIX)) {
            keys.push(key.slice(STORAGE_PREFIX.length));
          }
        }
        return keys;
      } catch {
        return [];
      }
    },
  };
}

export function createWebAdapter(): PlatformContext {
  return {
    platform: 'web',
    capabilities: createCapabilities(),
    backButton: createBackButtonController(),

    haptic: createHapticController(),
    dialog: createDialogController(),
    theme: createThemeController(),
    cloudStorage: createCloudStorageController(),

    openInvoice(_url: string): Promise<InvoiceStatus> {
      // Web can't handle Telegram invoices natively
      // Open in new tab and return pending
      window.open(_url, '_blank');
      return Promise.resolve('pending');
    },

    openLink(url: string, _options?: { tryInstantView?: boolean }) {
      window.open(url, '_blank', 'noopener,noreferrer');
    },

    openTelegramLink(url: string) {
      window.open(url, '_blank', 'noopener,noreferrer');
    },

    async share(text: string, url?: string): Promise<boolean> {
      if (navigator.share) {
        try {
          await navigator.share({ text, url });
          return true;
        } catch {
          // User cancelled share
          return false;
        }
      }

      // Fallback: copy to clipboard
      try {
        const shareText = url ? `${text}\n${url}` : text;
        await navigator.clipboard.writeText(shareText);
        return true;
      } catch {
        return false;
      }
    },

    setClosingConfirmation(enabled: boolean) {
      if (enabled) {
        window.onbeforeunload = (e) => {
          e.preventDefault();
          return '';
        };
      } else {
        window.onbeforeunload = null;
      }
    },
  };
}
