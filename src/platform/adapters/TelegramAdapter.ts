import { isInTelegramWebApp } from '@/hooks/useTelegramSDK';
import type {
  PlatformContext,
  PlatformCapabilities,
  BackButtonController,
  MainButtonController,
  HapticController,
  DialogController,
  ThemeController,
  CloudStorageController,
  MainButtonConfig,
  PopupOptions,
  InvoiceStatus,
  HapticImpactStyle,
  HapticNotificationType,
} from '@/platform/types';

// Use raw Telegram WebApp API directly - SDK has initialization issues
function getTelegram(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

function createCapabilities(): PlatformCapabilities {
  const tg = getTelegram();
  const inTelegram = isInTelegramWebApp();

  return {
    hasBackButton: inTelegram && !!tg?.BackButton,
    hasMainButton: inTelegram && !!tg?.MainButton,
    hasHapticFeedback: inTelegram && !!tg?.HapticFeedback,
    hasNativeDialogs: inTelegram && !!tg?.showPopup,
    hasThemeSync: inTelegram,
    hasInvoice: !!tg?.openInvoice,
    hasCloudStorage: inTelegram && !!tg?.CloudStorage,
    hasShare: true,
    version: tg?.version,
  };
}

function createBackButtonController(): BackButtonController {
  const tg = getTelegram();
  const inTelegram = isInTelegramWebApp();
  let currentCallback: (() => void) | null = null;

  return {
    get isVisible() {
      if (!inTelegram || !tg?.BackButton) return false;
      return tg.BackButton.isVisible;
    },

    show(onClick: () => void) {
      if (!inTelegram || !tg?.BackButton) return;

      // Remove previous callback if exists
      if (currentCallback) {
        tg.BackButton.offClick(currentCallback);
      }

      currentCallback = onClick;
      tg.BackButton.onClick(onClick);
      tg.BackButton.show();
    },

    hide() {
      if (!inTelegram || !tg?.BackButton) return;

      if (currentCallback) {
        tg.BackButton.offClick(currentCallback);
        currentCallback = null;
      }
      tg.BackButton.hide();
    },
  };
}

function createMainButtonController(): MainButtonController {
  const tg = getTelegram();
  const inTelegram = isInTelegramWebApp();
  let currentCallback: (() => void) | null = null;

  return {
    get isVisible() {
      if (!inTelegram || !tg?.MainButton) return false;
      return tg.MainButton.isVisible;
    },

    show(config: MainButtonConfig) {
      if (!inTelegram || !tg?.MainButton) return;

      // Remove previous callback if exists
      if (currentCallback) {
        tg.MainButton.offClick(currentCallback);
      }

      // Set button parameters
      tg.MainButton.setText(config.text);
      if (config.color) {
        tg.MainButton.color = config.color;
      }
      if (config.textColor) {
        tg.MainButton.textColor = config.textColor;
      }

      if (config.isActive === false) {
        tg.MainButton.disable();
      } else {
        tg.MainButton.enable();
      }

      if (config.isLoading) {
        tg.MainButton.showProgress();
      } else {
        tg.MainButton.hideProgress();
      }

      currentCallback = config.onClick;
      tg.MainButton.onClick(config.onClick);
      tg.MainButton.show();
    },

    hide() {
      if (!inTelegram || !tg?.MainButton) return;

      if (currentCallback) {
        tg.MainButton.offClick(currentCallback);
        currentCallback = null;
      }

      tg.MainButton.hideProgress();
      tg.MainButton.hide();
    },

    showProgress(show: boolean) {
      if (!inTelegram || !tg?.MainButton) return;

      if (show) {
        tg.MainButton.showProgress();
      } else {
        tg.MainButton.hideProgress();
      }
    },

    setText(text: string) {
      if (!inTelegram || !tg?.MainButton) return;
      tg.MainButton.setText(text);
    },

    setActive(active: boolean) {
      if (!inTelegram || !tg?.MainButton) return;

      if (active) {
        tg.MainButton.enable();
      } else {
        tg.MainButton.disable();
      }
    },
  };
}

function createHapticController(): HapticController {
  const tg = getTelegram();
  const inTelegram = isInTelegramWebApp();
  const haptic = tg?.HapticFeedback;

  return {
    impact(style: HapticImpactStyle = 'medium') {
      if (!inTelegram || !haptic) return;
      haptic.impactOccurred(style);
    },

    notification(type: HapticNotificationType) {
      if (!inTelegram || !haptic) return;
      haptic.notificationOccurred(type);
    },

    selection() {
      if (!inTelegram || !haptic) return;
      haptic.selectionChanged();
    },
  };
}

function createDialogController(): DialogController {
  const inTelegram = isInTelegramWebApp();
  let popupOpen = false;

  function showPopupSafe<T>(
    params: Parameters<NonNullable<TelegramWebApp['showPopup']>>[0],
    mapResult: (buttonId: string) => T,
    fallback: () => T,
  ): Promise<T> {
    const tg = getTelegram();

    if (!inTelegram || !tg?.showPopup) {
      return Promise.resolve(fallback());
    }

    if (popupOpen) {
      return Promise.resolve(mapResult(''));
    }

    return new Promise((resolve) => {
      popupOpen = true;
      tg.showPopup(params, (buttonId) => {
        popupOpen = false;
        resolve(mapResult(buttonId));
      });
    });
  }

  return {
    alert(message: string, _title?: string): Promise<void> {
      return showPopupSafe(
        { message, buttons: [{ type: 'ok' }] },
        () => undefined,
        () => {
          window.alert(message);
        },
      );
    },

    confirm(message: string, _title?: string): Promise<boolean> {
      return showPopupSafe(
        {
          message,
          buttons: [
            { id: 'ok', type: 'ok' },
            { id: 'cancel', type: 'cancel' },
          ],
        },
        (buttonId) => buttonId === 'ok',
        () => window.confirm(message),
      );
    },

    popup(options: PopupOptions): Promise<string | null> {
      return showPopupSafe(
        {
          title: options.title,
          message: options.message,
          buttons: options.buttons?.map((btn) => ({
            id: btn.id,
            type: btn.type,
            text: btn.text,
          })),
        },
        (buttonId) => buttonId || null,
        () => (window.confirm(options.message) ? 'ok' : null),
      );
    },
  };
}

function createThemeController(): ThemeController {
  const tg = getTelegram();
  const inTelegram = isInTelegramWebApp();

  return {
    setHeaderColor(color: string) {
      if (!inTelegram || !tg?.setHeaderColor) return;
      tg.setHeaderColor(color as `#${string}`);
    },

    setBottomBarColor(color: string) {
      if (!inTelegram || !tg?.setBottomBarColor) return;
      try {
        tg.setBottomBarColor(color as `#${string}`);
      } catch {
        // Not supported in this version
      }
    },

    getThemeParams() {
      if (!inTelegram || !tg?.themeParams) return null;
      const params = tg.themeParams;
      return {
        bg_color: params.bg_color,
        text_color: params.text_color,
        hint_color: params.hint_color,
        link_color: params.link_color,
        button_color: params.button_color,
        button_text_color: params.button_text_color,
        secondary_bg_color: params.secondary_bg_color,
        header_bg_color: params.header_bg_color,
        bottom_bar_bg_color: params.bottom_bar_bg_color,
        accent_text_color: params.accent_text_color,
        section_bg_color: params.section_bg_color,
        section_header_text_color: params.section_header_text_color,
        subtitle_text_color: params.subtitle_text_color,
        destructive_text_color: params.destructive_text_color,
      };
    },
  };
}

function createCloudStorageController(): CloudStorageController | null {
  const tg = getTelegram();
  const inTelegram = isInTelegramWebApp();
  const storage = tg?.CloudStorage;

  if (!inTelegram || !storage) return null;

  return {
    async getItem(key: string): Promise<string | null> {
      return new Promise((resolve) => {
        storage.getItem(key, (error, value) => {
          resolve(error ? null : value || null);
        });
      });
    },

    async setItem(key: string, value: string): Promise<void> {
      return new Promise((resolve, reject) => {
        storage.setItem(key, value, (error) => {
          if (error) reject(new Error(String(error)));
          else resolve();
        });
      });
    },

    async removeItem(key: string): Promise<void> {
      return new Promise((resolve, reject) => {
        storage.removeItem(key, (error) => {
          if (error) reject(new Error(String(error)));
          else resolve();
        });
      });
    },

    async getKeys(): Promise<string[]> {
      return new Promise((resolve) => {
        storage.getKeys((error, keys) => {
          resolve(error ? [] : keys || []);
        });
      });
    },
  };
}

export function createTelegramAdapter(): PlatformContext {
  const tg = getTelegram();

  return {
    platform: 'telegram',
    capabilities: createCapabilities(),
    backButton: createBackButtonController(),
    mainButton: createMainButtonController(),
    haptic: createHapticController(),
    dialog: createDialogController(),
    theme: createThemeController(),
    cloudStorage: createCloudStorageController(),

    openInvoice(url: string): Promise<InvoiceStatus> {
      return new Promise((resolve) => {
        if (tg?.openInvoice) {
          tg.openInvoice(url, (status) => resolve(status));
        } else {
          window.open(url, '_blank');
          resolve('pending');
        }
      });
    },

    openLink(url: string, options?: { tryInstantView?: boolean }) {
      if (tg?.openLink) {
        tg.openLink(url, { try_instant_view: options?.tryInstantView });
      } else {
        window.open(url, '_blank');
      }
    },

    openTelegramLink(url: string) {
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
      } else {
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

      const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
      if (botUsername && tg?.openTelegramLink) {
        const encoded = encodeURIComponent(shareText);
        tg.openTelegramLink(`https://t.me/share/url?url=${encoded}`);
        return true;
      }

      return false;
    },

    setClosingConfirmation(enabled: boolean) {
      if (enabled) {
        tg?.enableClosingConfirmation?.();
      } else {
        tg?.disableClosingConfirmation?.();
      }
    },

    telegram: tg,
  };
}
