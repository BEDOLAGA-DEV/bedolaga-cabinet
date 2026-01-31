/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_LOGO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Telegram WebApp types - comprehensive type definitions for Bot API 8.0+
interface TelegramWebApp {
  // Init data
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: {
      id: number;
      is_bot?: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      added_to_attachment_menu?: boolean;
      allows_write_to_pm?: boolean;
      photo_url?: string;
    };
    receiver?: {
      id: number;
      is_bot?: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      added_to_attachment_menu?: boolean;
      allows_write_to_pm?: boolean;
      photo_url?: string;
    };
    chat?: {
      id: number;
      type: 'group' | 'supergroup' | 'channel';
      title: string;
      username?: string;
      photo_url?: string;
    };
    chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
  };

  // Platform info
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';

  // App state
  isExpanded: boolean;
  isClosingConfirmationEnabled: boolean;
  isVerticalSwipesEnabled: boolean;
  isFullscreen: boolean;
  isOrientationLocked: boolean;
  isActive: boolean;

  // Viewport
  viewportHeight: number;
  viewportStableHeight: number;

  // Safe areas
  safeAreaInset: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset: { top: number; bottom: number; left: number; right: number };

  // Theme colors (settable)
  headerColor: string;
  backgroundColor: string;
  bottomBarColor?: string;

  // Theme params (from Telegram)
  themeParams: {
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
    section_separator_color?: string;
    subtitle_text_color?: string;
    destructive_text_color?: string;
  };

  // Lifecycle methods
  ready: () => void;
  expand: () => void;
  close: () => void;

  // Links
  openLink: (url: string, options?: { try_instant_view?: boolean; try_browser?: boolean }) => void;
  openTelegramLink: (url: string) => void;

  // Invoice
  openInvoice: (
    url: string,
    callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void,
  ) => void;

  // Fullscreen API (Bot API 8.0+)
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  lockOrientation: () => void;
  unlockOrientation: () => void;

  // Vertical swipes control
  disableVerticalSwipes: () => void;
  enableVerticalSwipes: () => void;

  // Closing confirmation
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;

  // Theme color control
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor?: (color: string) => void;

  // Event handlers
  onEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;
  offEvent: (eventType: string, callback: (...args: unknown[]) => void) => void;

  // Data sending
  sendData: (data: string) => void;

  // QR Scanner
  showScanQrPopup: (params: { text?: string }, callback?: (text: string) => boolean | void) => void;
  closeScanQrPopup: () => void;

  // Clipboard
  readTextFromClipboard: (callback?: (text: string | null) => void) => void;

  // Write access
  requestWriteAccess: (callback?: (granted: boolean) => void) => void;

  // Contact
  requestContact: (callback?: (granted: boolean) => void) => void;

  // Emoji status (Bot API 8.0+)
  requestEmojiStatusAccess: (callback?: (granted: boolean) => void) => void;
  setEmojiStatus: (
    customEmojiId: string,
    params?: { duration?: number },
    callback?: (success: boolean) => void,
  ) => void;

  // Download file (Bot API 8.0+)
  downloadFile: (
    params: { url: string; file_name: string },
    callback?: (success: boolean) => void,
  ) => void;

  // Share story (Bot API 7.8+)
  shareToStory?: (
    mediaUrl: string,
    params?: { text?: string; widget_link?: { url: string; name?: string } },
  ) => void;

  // Version check helper
  isVersionAtLeast: (version: string) => boolean;

  // Main Button
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      has_shine_effect?: boolean;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };

  // Secondary Button (Bot API 7.10+)
  SecondaryButton?: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    position: 'left' | 'right' | 'top' | 'bottom';
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      has_shine_effect?: boolean;
      is_active?: boolean;
      is_visible?: boolean;
      position?: 'left' | 'right' | 'top' | 'bottom';
    }) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };

  // Back Button
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };

  // Settings Button (Bot API 7.0+)
  SettingsButton?: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };

  // Haptic Feedback (Bot API 6.1+)
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
    selectionChanged: () => void;
  };

  // Popups (Bot API 6.2+)
  showPopup: (
    params: {
      title?: string;
      message: string;
      buttons?: Array<{
        id?: string;
        type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
        text?: string;
      }>;
    },
    callback?: (buttonId: string) => void,
  ) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;

  // Cloud Storage (Bot API 6.9+)
  CloudStorage: {
    setItem: (
      key: string,
      value: string,
      callback?: (error: Error | null, stored: boolean) => void,
    ) => void;
    getItem: (key: string, callback: (error: Error | null, value: string) => void) => void;
    getItems: (
      keys: string[],
      callback: (error: Error | null, values: Record<string, string>) => void,
    ) => void;
    removeItem: (key: string, callback?: (error: Error | null, removed: boolean) => void) => void;
    removeItems: (
      keys: string[],
      callback?: (error: Error | null, removed: boolean) => void,
    ) => void;
    getKeys: (callback: (error: Error | null, keys: string[]) => void) => void;
  };

  // Biometric (Bot API 7.2+)
  BiometricManager?: {
    isInited: boolean;
    isBiometricAvailable: boolean;
    biometricType: 'finger' | 'face' | 'unknown';
    isAccessRequested: boolean;
    isAccessGranted: boolean;
    isBiometricTokenSaved: boolean;
    deviceId: string;
    init: (callback?: () => void) => void;
    requestAccess: (params: { reason?: string }, callback?: (granted: boolean) => void) => void;
    authenticate: (
      params: { reason?: string },
      callback?: (success: boolean, token?: string) => void,
    ) => void;
    updateBiometricToken: (token: string, callback?: (success: boolean) => void) => void;
    openSettings: () => void;
  };

  // Accelerometer (Bot API 8.0+)
  Accelerometer?: {
    isStarted: boolean;
    x: number | null;
    y: number | null;
    z: number | null;
    start: (params?: { refresh_rate?: number }, callback?: (started: boolean) => void) => void;
    stop: (callback?: (stopped: boolean) => void) => void;
  };

  // DeviceOrientation (Bot API 8.0+)
  DeviceOrientation?: {
    isStarted: boolean;
    absolute: boolean;
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    start: (
      params?: { refresh_rate?: number; need_absolute?: boolean },
      callback?: (started: boolean) => void,
    ) => void;
    stop: (callback?: (stopped: boolean) => void) => void;
  };

  // Gyroscope (Bot API 8.0+)
  Gyroscope?: {
    isStarted: boolean;
    x: number | null;
    y: number | null;
    z: number | null;
    start: (params?: { refresh_rate?: number }, callback?: (started: boolean) => void) => void;
    stop: (callback?: (stopped: boolean) => void) => void;
  };

  // Location Manager (Bot API 8.0+)
  LocationManager?: {
    isInited: boolean;
    isLocationAvailable: boolean;
    isAccessRequested: boolean;
    isAccessGranted: boolean;
    init: (callback?: () => void) => void;
    getLocation: (
      callback: (
        location: {
          latitude: number;
          longitude: number;
          altitude?: number;
          course?: number;
          speed?: number;
          horizontal_accuracy?: number;
          vertical_accuracy?: number;
          course_accuracy?: number;
          speed_accuracy?: number;
        } | null,
      ) => void,
    ) => void;
    openSettings: () => void;
  };
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
