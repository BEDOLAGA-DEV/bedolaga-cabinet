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

function getTelegram(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

function isVersionAtLeast(version: string): boolean {
  const tg = getTelegram();
  if (!tg) return false;
  return tg.isVersionAtLeast?.(version) ?? false;
}

function createCapabilities(): PlatformCapabilities {
  const tg = getTelegram();
  return {
    hasBackButton: !!tg?.BackButton,
    hasMainButton: !!tg?.MainButton,
    hasHapticFeedback: isVersionAtLeast('6.1') && !!tg?.HapticFeedback,
    hasNativeDialogs: isVersionAtLeast('6.2'),
    hasThemeSync: isVersionAtLeast('6.1'),
    hasInvoice: !!tg?.openInvoice,
    hasCloudStorage: isVersionAtLeast('6.9') && !!tg?.CloudStorage,
    hasShare: true, // openTelegramLink is always available
    version: tg?.version,
  };
}

function createBackButtonController(): BackButtonController {
  const tg = getTelegram();
  let currentCallback: (() => void) | null = null;

  return {
    get isVisible() {
      return tg?.BackButton?.isVisible ?? false;
    },

    show(onClick: () => void) {
      if (!tg?.BackButton) return;

      // Remove previous callback if exists
      if (currentCallback) {
        tg.BackButton.offClick(currentCallback);
      }

      currentCallback = onClick;
      tg.BackButton.onClick(onClick);
      tg.BackButton.show();
    },

    hide() {
      if (!tg?.BackButton) return;

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
  let currentCallback: (() => void) | null = null;

  return {
    get isVisible() {
      return tg?.MainButton?.isVisible ?? false;
    },

    show(config: MainButtonConfig) {
      if (!tg?.MainButton) return;

      // Remove previous callback if exists
      if (currentCallback) {
        tg.MainButton.offClick(currentCallback);
      }

      currentCallback = config.onClick;

      // Set button parameters
      if (tg.MainButton.setParams) {
        tg.MainButton.setParams({
          text: config.text,
          color: config.color,
          text_color: config.textColor,
          is_active: config.isActive !== false,
          is_visible: true,
        });
      } else {
        tg.MainButton.text = config.text;
        if (config.color) tg.MainButton.color = config.color;
        if (config.textColor) tg.MainButton.textColor = config.textColor;
      }

      tg.MainButton.onClick(config.onClick);

      if (config.isActive === false) {
        tg.MainButton.disable();
      } else {
        tg.MainButton.enable();
      }

      if (config.isLoading) {
        tg.MainButton.showProgress?.(true);
      } else {
        tg.MainButton.hideProgress?.();
      }

      tg.MainButton.show();
    },

    hide() {
      if (!tg?.MainButton) return;

      if (currentCallback) {
        tg.MainButton.offClick(currentCallback);
        currentCallback = null;
      }

      tg.MainButton.hideProgress?.();
      tg.MainButton.hide();
    },

    showProgress(show: boolean) {
      if (!tg?.MainButton) return;

      if (show) {
        tg.MainButton.showProgress?.(true);
      } else {
        tg.MainButton.hideProgress?.();
      }
    },

    setText(text: string) {
      if (!tg?.MainButton) return;

      if (tg.MainButton.setText) {
        tg.MainButton.setText(text);
      } else {
        tg.MainButton.text = text;
      }
    },

    setActive(active: boolean) {
      if (!tg?.MainButton) return;

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

  return {
    impact(style: HapticImpactStyle = 'medium') {
      tg?.HapticFeedback?.impactOccurred(style);
    },

    notification(type: HapticNotificationType) {
      tg?.HapticFeedback?.notificationOccurred(type);
    },

    selection() {
      tg?.HapticFeedback?.selectionChanged();
    },
  };
}

function createDialogController(): DialogController {
  const tg = getTelegram();

  return {
    alert(message: string, _title?: string): Promise<void> {
      return new Promise((resolve) => {
        if (tg?.showAlert) {
          tg.showAlert(message, () => resolve());
        } else {
          window.alert(message);
          resolve();
        }
      });
    },

    confirm(message: string, _title?: string): Promise<boolean> {
      return new Promise((resolve) => {
        if (tg?.showConfirm) {
          tg.showConfirm(message, (confirmed) => resolve(confirmed));
        } else {
          resolve(window.confirm(message));
        }
      });
    },

    popup(options: PopupOptions): Promise<string | null> {
      return new Promise((resolve) => {
        if (tg?.showPopup) {
          tg.showPopup(
            {
              title: options.title,
              message: options.message,
              buttons: options.buttons?.map((btn) => ({
                id: btn.id,
                type: btn.type,
                text: btn.text,
              })),
            },
            (buttonId) => resolve(buttonId),
          );
        } else {
          // Fallback to confirm for web
          const confirmed = window.confirm(options.message);
          resolve(confirmed ? 'ok' : null);
        }
      });
    },
  };
}

function createThemeController(): ThemeController {
  const tg = getTelegram();

  return {
    setHeaderColor(color: string) {
      tg?.setHeaderColor?.(color);
    },

    setBottomBarColor(color: string) {
      tg?.setBottomBarColor?.(color);
    },

    getThemeParams() {
      return tg?.themeParams ?? null;
    },
  };
}

function createCloudStorageController(): CloudStorageController | null {
  const tg = getTelegram();
  if (!tg?.CloudStorage) return null;

  return {
    getItem(key: string): Promise<string | null> {
      return new Promise((resolve, reject) => {
        tg.CloudStorage.getItem(key, (error, value) => {
          if (error) reject(error);
          else resolve(value || null);
        });
      });
    },

    setItem(key: string, value: string): Promise<void> {
      return new Promise((resolve, reject) => {
        tg.CloudStorage.setItem(key, value, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },

    removeItem(key: string): Promise<void> {
      return new Promise((resolve, reject) => {
        tg.CloudStorage.removeItem(key, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },

    getKeys(): Promise<string[]> {
      return new Promise((resolve, reject) => {
        tg.CloudStorage.getKeys((error, keys) => {
          if (error) reject(error);
          else resolve(keys);
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
