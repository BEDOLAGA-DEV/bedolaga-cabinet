// Platform abstraction layer
// Provides unified APIs for Telegram Mini Apps and web browser

// Context and Provider
export { PlatformContext } from './PlatformContext';
export { PlatformProvider } from './PlatformProvider';

// Types
export type {
  PlatformType,
  PlatformContext as PlatformContextType,
  PlatformCapabilities,
  PopupOptions,
  PopupButton,
  InvoiceStatus,
  HapticImpactStyle,
  HapticNotificationType,
  BackButtonController,
  HapticController,
  DialogController,
  ThemeController,
  CloudStorageController,
  TelegramThemeParams,
} from './types';

// Hooks
export { usePlatform, useIsTelegram, useCapability } from './hooks/usePlatform';
export { useBackButton, useConditionalBackButton } from './hooks/useBackButton';
export { useHaptic, useHapticClick, useHapticFeedback } from './hooks/useHaptic';
export { useNativeDialog, useDestructiveConfirm, PopupButtons } from './hooks/useNativeDialog';
export { useNotify } from './hooks/useNotify';
