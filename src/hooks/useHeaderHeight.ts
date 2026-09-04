import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { UI } from '@/config/constants';

/**
 * Computes the app header height in pixels, accounting for
 * Telegram MiniApp safe area insets in fullscreen mode.
 *
 * Desktop: 56px (h-14). Mobile: 64px (h-16) + safe area + TG header when fullscreen.
 * bottomSafeArea: TG SDK bottom inset (home indicator etc.), 0 outside TG.
 */
/**
 * Высота мобильной шапки как CSS-длина. Вне fullscreen Telegram добавляет
 * env(safe-area-inset-top): в standalone-режиме iOS («На экран Домой», статус-бар
 * black-translucent) страница начинается под статус-баром, и шапка продолжается
 * под него через padding-top — распорка контента и оверлей меню должны это
 * учитывать.
 */
export function headerHeightCss(mobilePx: number, isMobileFullscreen: boolean): string {
  return isMobileFullscreen
    ? `${mobilePx}px`
    : `calc(${mobilePx}px + env(safe-area-inset-top, 0px))`;
}

export function useHeaderHeight(): {
  mobile: number;
  mobileCss: string;
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

  return {
    mobile,
    mobileCss: headerHeightCss(mobile, isMobileFullscreen),
    desktop: UI.DESKTOP_HEADER_HEIGHT_PX,
    bottomSafeArea,
    isMobileFullscreen,
  };
}
