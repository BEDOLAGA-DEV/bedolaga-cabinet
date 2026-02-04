import { isInTelegramWebApp } from '@/hooks/useTelegramSDK';
import {
  showBackButton,
  hideBackButton,
  onBackButtonClick,
  offBackButtonClick,
  isBackButtonVisible,
  hapticFeedbackImpactOccurred,
  hapticFeedbackNotificationOccurred,
  hapticFeedbackSelectionChanged,
  showPopup,
  setMiniAppHeaderColor,
  setMiniAppBottomBarColor,
  themeParamsState,
  getCloudStorageItem,
  setCloudStorageItem,
  deleteCloudStorageItem,
  getCloudStorageKeys,
  openInvoice,
  openLink,
  openTelegramLink,
  shareURL,
  enableClosingConfirmation,
  disableClosingConfirmation,
} from '@telegram-apps/sdk-react';
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

function createCapabilities(): PlatformCapabilities {
  const inTelegram = isInTelegramWebApp();

  return {
    hasBackButton: inTelegram,

    hasHapticFeedback: inTelegram,
    hasNativeDialogs: inTelegram,
    hasThemeSync: inTelegram,
    hasInvoice: inTelegram,
    hasCloudStorage: inTelegram,
    hasShare: true,
    version: undefined,
  };
}

function createBackButtonController(): BackButtonController {
  const inTelegram = isInTelegramWebApp();
  let currentCallback: (() => void) | null = null;

  return {
    get isVisible() {
      if (!inTelegram) return false;
      try {
        return isBackButtonVisible();
      } catch {
        return false;
      }
    },

    show(onClick: () => void) {
      if (!inTelegram) return;

      if (currentCallback) {
        try {
          offBackButtonClick(currentCallback);
        } catch {
          // ignore
        }
      }

      currentCallback = onClick;
      try {
        onBackButtonClick(onClick);
        showBackButton();
      } catch {
        // Back button not mounted
      }
    },

    hide() {
      if (!inTelegram) return;

      if (currentCallback) {
        try {
          offBackButtonClick(currentCallback);
        } catch {
          // ignore
        }
        currentCallback = null;
      }
      try {
        hideBackButton();
      } catch {
        // Back button not mounted
      }
    },
  };
}

function createHapticController(): HapticController {
  const inTelegram = isInTelegramWebApp();

  return {
    impact(style: HapticImpactStyle = 'medium') {
      if (!inTelegram) return;
      try {
        hapticFeedbackImpactOccurred(style);
      } catch {
        // Haptic not available
      }
    },

    notification(type: HapticNotificationType) {
      if (!inTelegram) return;
      try {
        hapticFeedbackNotificationOccurred(type);
      } catch {
        // Haptic not available
      }
    },

    selection() {
      if (!inTelegram) return;
      try {
        hapticFeedbackSelectionChanged();
      } catch {
        // Haptic not available
      }
    },
  };
}

function createDialogController(): DialogController {
  const inTelegram = isInTelegramWebApp();

  return {
    async alert(message: string, _title?: string): Promise<void> {
      if (!inTelegram) {
        window.alert(message);
        return;
      }
      try {
        await showPopup({
          message,
          buttons: [{ type: 'ok', id: 'ok' }],
        });
      } catch {
        window.alert(message);
      }
    },

    async confirm(message: string, _title?: string): Promise<boolean> {
      if (!inTelegram) {
        return window.confirm(message);
      }
      try {
        const buttonId = await showPopup({
          message,
          buttons: [
            { type: 'ok', id: 'ok' },
            { type: 'cancel', id: 'cancel' },
          ],
        });
        return buttonId === 'ok';
      } catch {
        return window.confirm(message);
      }
    },

    async popup(options: PopupOptions): Promise<string | null> {
      if (!inTelegram) {
        return window.confirm(options.message) ? 'ok' : null;
      }
      try {
        const buttons = options.buttons?.map((btn) => {
          // For 'ok', 'close', 'cancel' types: do NOT include text
          // For 'default', 'destructive' types: text is required
          if (btn.type === 'ok' || btn.type === 'close' || btn.type === 'cancel') {
            return { type: btn.type, id: btn.id };
          }
          return { type: btn.type ?? ('default' as const), id: btn.id, text: btn.text };
        });

        const buttonId = await showPopup({
          title: options.title,
          message: options.message,
          buttons: buttons as Parameters<typeof showPopup>[0]['buttons'],
        });
        return buttonId || null;
      } catch {
        return window.confirm(options.message) ? 'ok' : null;
      }
    },
  };
}

function createThemeController(): ThemeController {
  const inTelegram = isInTelegramWebApp();

  return {
    setHeaderColor(color: string) {
      if (!inTelegram) return;
      try {
        setMiniAppHeaderColor(color as `#${string}`);
      } catch {
        // Not supported
      }
    },

    setBottomBarColor(color: string) {
      if (!inTelegram) return;
      try {
        setMiniAppBottomBarColor(color as `#${string}`);
      } catch {
        // Not supported
      }
    },

    getThemeParams() {
      if (!inTelegram) return null;
      try {
        const params = themeParamsState();
        if (!params) return null;
        // SDK v3 uses camelCase — convert to snake_case for our interface
        return {
          bg_color: params.bgColor,
          text_color: params.textColor,
          hint_color: params.hintColor,
          link_color: params.linkColor,
          button_color: params.buttonColor,
          button_text_color: params.buttonTextColor,
          secondary_bg_color: params.secondaryBgColor,
          header_bg_color: params.headerBgColor,
          bottom_bar_bg_color: params.bottomBarBgColor,
          accent_text_color: params.accentTextColor,
          section_bg_color: params.sectionBgColor,
          section_header_text_color: params.sectionHeaderTextColor,
          subtitle_text_color: params.subtitleTextColor,
          destructive_text_color: params.destructiveTextColor,
        };
      } catch {
        return null;
      }
    },
  };
}

function createCloudStorageController(): CloudStorageController | null {
  const inTelegram = isInTelegramWebApp();
  if (!inTelegram) return null;

  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const value = await getCloudStorageItem(key);
        return value === '' ? null : value;
      } catch {
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      await setCloudStorageItem(key, value);
    },

    async removeItem(key: string): Promise<void> {
      await deleteCloudStorageItem(key);
    },

    async getKeys(): Promise<string[]> {
      try {
        return await getCloudStorageKeys();
      } catch {
        return [];
      }
    },
  };
}

export function createTelegramAdapter(): PlatformContext {
  return {
    platform: 'telegram',
    capabilities: createCapabilities(),
    backButton: createBackButtonController(),

    haptic: createHapticController(),
    dialog: createDialogController(),
    theme: createThemeController(),
    cloudStorage: createCloudStorageController(),

    openInvoice(url: string): Promise<InvoiceStatus> {
      try {
        return openInvoice(url, 'url') as Promise<InvoiceStatus>;
      } catch {
        window.open(url, '_blank');
        return Promise.resolve('pending');
      }
    },

    openLink(url: string, options?: { tryInstantView?: boolean }) {
      try {
        openLink(url, { tryInstantView: options?.tryInstantView });
      } catch {
        window.open(url, '_blank');
      }
    },

    openTelegramLink(url: string) {
      try {
        openTelegramLink(url);
      } catch {
        window.open(url, '_blank');
      }
    },

    async share(text: string, url?: string): Promise<boolean> {
      const shareText = url ? `${text}\n${url}` : text;

      if (navigator.share) {
        try {
          await navigator.share({ text: shareText, url });
          return true;
        } catch {
          // User cancelled or share failed
        }
      }

      try {
        shareURL(url || shareText, text);
        return true;
      } catch {
        return false;
      }
    },

    setClosingConfirmation(enabled: boolean) {
      try {
        if (enabled) {
          enableClosingConfirmation();
        } else {
          disableClosingConfirmation();
        }
      } catch {
        // Not supported
      }
    },
  };
}
