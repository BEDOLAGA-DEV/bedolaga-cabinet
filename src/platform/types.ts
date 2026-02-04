// Platform type definitions

export type PlatformType = 'telegram' | 'web';

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

export interface PopupButton {
  id: string;
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text: string;
}

export interface PopupOptions {
  title?: string;
  message: string;
  buttons?: PopupButton[];
}

export interface PlatformCapabilities {
  hasBackButton: boolean;

  hasHapticFeedback: boolean;
  hasNativeDialogs: boolean;
  hasThemeSync: boolean;
  hasInvoice: boolean;
  hasCloudStorage: boolean;
  hasShare: boolean;
  version?: string;
}

export interface BackButtonController {
  show: (onClick: () => void) => void;
  hide: () => void;
  isVisible: boolean;
}

export interface HapticController {
  impact: (style?: HapticImpactStyle) => void;
  notification: (type: HapticNotificationType) => void;
  selection: () => void;
}

export interface DialogController {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  popup: (options: PopupOptions) => Promise<string | null>;
}

export interface ThemeController {
  setHeaderColor: (color: string) => void;
  setBottomBarColor: (color: string) => void;
  getThemeParams: () => TelegramThemeParams | null;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface CloudStorageController {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getKeys: () => Promise<string[]>;
}

export interface PlatformContext {
  platform: PlatformType;
  capabilities: PlatformCapabilities;

  // Navigation
  backButton: BackButtonController;

  // Haptic feedback
  haptic: HapticController;

  // Native dialogs
  dialog: DialogController;

  // Theme synchronization
  theme: ThemeController;

  // Cloud storage (Telegram only)
  cloudStorage: CloudStorageController | null;

  // Invoice/Payment
  openInvoice: (url: string) => Promise<InvoiceStatus>;

  // Links
  openLink: (url: string, options?: { tryInstantView?: boolean }) => void;
  openTelegramLink: (url: string) => void;

  // Share
  share: (text: string, url?: string) => Promise<boolean>;

  // Closing confirmation
  setClosingConfirmation: (enabled: boolean) => void;
}
