import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { UI } from '@/config/constants';

/**
 * Computes the app header height in pixels, accounting for
 * Telegram MiniApp safe area insets in fullscreen mode.
 *
 * Desktop: 56px (h-14). Mobile: 64px (h-16) + safe area + TG header when fullscreen.
 * bottomSafeArea: TG SDK bottom inset (home indicator etc.), 0 outside TG.
 */
export function useHeaderHeight(): {
  mobile: number;
  desktop: number;
  bottomSafeArea: number;
  isMobileFullscreen: boolean;
} {
  const { isFullscreen, safeAreaInset, contentSafeAreaInset, platform, isMobile } =
    useTelegramSDK();
  const isMobileFullscreen = isFullscreen && isMobile;

  const telegramHeaderHeight =
    platform === 'android' ? UI.TELEGRAM_HEADER_ANDROID_PX : UI.TELEGRAM_HEADER_IOS_PX;

  const mobile = isMobileFullscreen
    ? UI.MOBILE_HEADER_HEIGHT_PX +
      Math.max(safeAreaInset.top, contentSafeAreaInset.top) +
      telegramHeaderHeight
    : UI.MOBILE_HEADER_HEIGHT_PX;

  const bottomSafeArea = isMobileFullscreen
    ? Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom)
    : 0;

  return { mobile, desktop: UI.DESKTOP_HEADER_HEIGHT_PX, bottomSafeArea, isMobileFullscreen };
}
