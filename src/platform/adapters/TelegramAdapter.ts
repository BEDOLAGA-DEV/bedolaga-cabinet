import {
  backButton,
  mainButton,
  hapticFeedback,
  cloudStorage,
  themeParams,
  popup,
  miniApp,
} from '@tma.js/sdk-react';
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

// Keep reference to raw Telegram WebApp for features not in SDK
function getTelegram(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

function safeIsSupported(checkFn: () => boolean): boolean {
  try {
    return checkFn();
  } catch {
    return false;
  }
}

function createCapabilities(): PlatformCapabilities {
  const tg = getTelegram();
  const inTelegram = isInTelegramWebApp();

  return {
    hasBackButton: inTelegram && safeIsSupported(() => backButton.isSupported()),
    hasMainButton: inTelegram,
    hasHapticFeedback: inTelegram && safeIsSupported(() => hapticFeedback.isSupported()),
    hasNativeDialogs: inTelegram && safeIsSupported(() => popup.isSupported()),
    hasThemeSync: inTelegram,
    hasInvoice: !!tg?.openInvoice,
    hasCloudStorage: inTelegram && safeIsSupported(() => cloudStorage.isSupported()),
    hasShare: true,
    version: tg?.version,
  };
}

function createBackButtonController(): BackButtonController {
  const inTelegram = isInTelegramWebApp();
  let removeClickListener: VoidFunction | null = null;

  // Mount back button on first use
  let mounted = false;
  const ensureMounted = () => {
    if (!mounted && inTelegram && safeIsSupported(() => backButton.isSupported())) {
      try {
        backButton.mount();
        mounted = true;
      } catch {
        // Already mounted or not supported
      }
    }
  };

  return {
    get isVisible() {
      if (!inTelegram || !mounted) return false;
      try {
        return backButton.isVisible();
      } catch {
        return false;
      }
    },

    show(onClick: () => void) {
      if (!inTelegram || !safeIsSupported(() => backButton.isSupported())) return;

      ensureMounted();

      // Remove previous callback if exists
      if (removeClickListener) {
        removeClickListener();
        removeClickListener = null;
      }

      removeClickListener = backButton.onClick(onClick);
      backButton.show();
    },

    hide() {
      if (!inTelegram || !safeIsSupported(() => backButton.isSupported())) return;

      if (removeClickListener) {
        removeClickListener();
        removeClickListener = null;
      }
      backButton.hide();
    },
  };
}

function createMainButtonController(): MainButtonController {
  const inTelegram = isInTelegramWebApp();
  let removeClickListener: VoidFunction | null = null;

  // Mount main button on first use
  let mounted = false;
  const ensureMounted = () => {
    if (!mounted && inTelegram) {
      try {
        mainButton.mount();
        mounted = true;
      } catch {
        // Already mounted or not supported
      }
    }
  };

  return {
    get isVisible() {
      if (!inTelegram || !mounted) return false;
      try {
        return mainButton.isVisible();
      } catch {
        return false;
      }
    },

    show(config: MainButtonConfig) {
      if (!inTelegram) return;

      ensureMounted();

      // Remove previous callback if exists
      if (removeClickListener) {
        removeClickListener();
        removeClickListener = null;
      }

      // Set button parameters
      mainButton.setParams({
        text: config.text,
        bgColor: config.color as `#${string}` | undefined,
        textColor: config.textColor as `#${string}` | undefined,
        isEnabled: config.isActive !== false,
        isVisible: true,
        isLoaderVisible: config.isLoading || false,
      });

      removeClickListener = mainButton.onClick(config.onClick);
      mainButton.show();
    },

    hide() {
      if (!inTelegram) return;

      if (removeClickListener) {
        removeClickListener();
        removeClickListener = null;
      }

      mainButton.hideLoader();
      mainButton.hide();
    },

    showProgress(show: boolean) {
      if (!inTelegram) return;

      if (show) {
        mainButton.showLoader();
      } else {
        mainButton.hideLoader();
      }
    },

    setText(text: string) {
      if (!inTelegram) return;
      mainButton.setText(text);
    },

    setActive(active: boolean) {
      if (!inTelegram) return;

      if (active) {
        mainButton.enable();
      } else {
        mainButton.disable();
      }
    },
  };
}

function createHapticController(): HapticController {
  const inTelegram = isInTelegramWebApp();
  const isSupported = inTelegram && safeIsSupported(() => hapticFeedback.isSupported());

  return {
    impact(style: HapticImpactStyle = 'medium') {
      if (!isSupported) return;
      hapticFeedback.impactOccurred(style);
    },

    notification(type: HapticNotificationType) {
      if (!isSupported) return;
      hapticFeedback.notificationOccurred(type);
    },

    selection() {
      if (!isSupported) return;
      hapticFeedback.selectionChanged();
    },
  };
}

function createDialogController(): DialogController {
  const inTelegram = isInTelegramWebApp();
  const isSupported = inTelegram && safeIsSupported(() => popup.isSupported());

  return {
    alert(message: string, _title?: string): Promise<void> {
      return new Promise((resolve) => {
        if (isSupported) {
          popup
            .show({
              message,
              buttons: [{ type: 'ok' }],
            })
            .then(() => resolve());
        } else {
          window.alert(message);
          resolve();
        }
      });
    },

    confirm(message: string, _title?: string): Promise<boolean> {
      return new Promise((resolve) => {
        if (isSupported) {
          popup
            .show({
              message,
              buttons: [
                { id: 'ok', type: 'ok' },
                { id: 'cancel', type: 'cancel' },
              ],
            })
            .then((buttonId) => resolve(buttonId === 'ok'));
        } else {
          resolve(window.confirm(message));
        }
      });
    },

    popup(options: PopupOptions): Promise<string | null> {
      return new Promise((resolve) => {
        if (isSupported) {
          popup
            .show({
              title: options.title,
              message: options.message,
              buttons: options.buttons?.map((btn) => ({
                id: btn.id,
                type: btn.type,
                text: btn.text,
              })),
            })
            .then((buttonId) => resolve(buttonId ?? null));
        } else {
          const confirmed = window.confirm(options.message);
          resolve(confirmed ? 'ok' : null);
        }
      });
    },
  };
}

function createThemeController(): ThemeController {
  const inTelegram = isInTelegramWebApp();

  // Mount theme params on first use
  let mounted = false;
  const ensureMounted = () => {
    if (!mounted && inTelegram) {
      try {
        themeParams.mount();
        mounted = true;
      } catch {
        // Already mounted
      }
    }
  };

  return {
    setHeaderColor(color: string) {
      if (!inTelegram) return;
      miniApp.setHeaderColor(color as `#${string}`);
    },

    setBottomBarColor(color: string) {
      if (!inTelegram) return;
      try {
        miniApp.setBottomBarColor(color as `#${string}`);
      } catch {
        // Not supported in this version
      }
    },

    getThemeParams() {
      if (!inTelegram) return null;
      ensureMounted();
      try {
        const state = themeParams.state();
        // Convert SDK format to our format
        return {
          bg_color: state.bgColor,
          text_color: state.textColor,
          hint_color: state.hintColor,
          link_color: state.linkColor,
          button_color: state.buttonColor,
          button_text_color: state.buttonTextColor,
          secondary_bg_color: state.secondaryBgColor,
          header_bg_color: state.headerBgColor,
          bottom_bar_bg_color: state.bottomBarBgColor,
          accent_text_color: state.accentTextColor,
          section_bg_color: state.sectionBgColor,
          section_header_text_color: state.sectionHeaderTextColor,
          subtitle_text_color: state.subtitleTextColor,
          destructive_text_color: state.destructiveTextColor,
        };
      } catch {
        return null;
      }
    },
  };
}

function createCloudStorageController(): CloudStorageController | null {
  const inTelegram = isInTelegramWebApp();
  if (!inTelegram || !safeIsSupported(() => cloudStorage.isSupported())) return null;

  return {
    async getItem(key: string): Promise<string | null> {
      const value = await cloudStorage.getItem(key);
      return value || null;
    },

    async setItem(key: string, value: string): Promise<void> {
      await cloudStorage.setItem(key, value);
    },

    async removeItem(key: string): Promise<void> {
      await cloudStorage.deleteItem(key);
    },

    async getKeys(): Promise<string[]> {
      return cloudStorage.getKeys();
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
          // Fallback: open in new window
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

      // Try native share API first (if available on mobile)
      if (navigator.share) {
        try {
          await navigator.share({ text: shareText, url });
          return true;
        } catch {
          // User cancelled or share failed, continue to Telegram share
        }
      }

      // Use Telegram share
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
