import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { UI } from '@/config/constants';

interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TelegramSafeAreaInput {
  isMobileFullscreen: boolean;
  platform: string | undefined;
  safeAreaInset: Insets;
  contentSafeAreaInset: Insets;
}

/**
 * Отступы Telegram в fullscreen Mini App: сверху поверх страницы лежат статус-бар и кнопки
 * «Назад / ⌄ …», снизу — полоска Home. Одна формула для всего, что прижато к краю экрана
 * (шапка, шиты, плашки). Вне fullscreen webview начинается ниже шапки Telegram — нули.
 */
export function telegramSafeAreas(input: TelegramSafeAreaInput): { top: number; bottom: number } {
  if (!input.isMobileFullscreen) return { top: 0, bottom: 0 };
  const telegramHeaderHeight =
    input.platform === 'android' ? UI.TELEGRAM_HEADER_ANDROID_PX : UI.TELEGRAM_HEADER_IOS_PX;
  return {
    top: Math.max(input.safeAreaInset.top, input.contentSafeAreaInset.top) + telegramHeaderHeight,
    bottom: Math.max(input.safeAreaInset.bottom, input.contentSafeAreaInset.bottom),
  };
}

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

/**
 * Высота шапки в пикселях с учётом отступов Telegram в fullscreen Mini App.
 * Desktop: 56px (h-14). Mobile: 64px (h-16) + safe area + шапка Telegram в fullscreen.
 * topSafeArea / bottomSafeArea: отступы Telegram из SDK, 0 вне Telegram.
 */
export function useHeaderHeight(): {
  mobile: number;
  mobileCss: string;
  desktop: number;
  topSafeArea: number;
  bottomSafeArea: number;
  isMobileFullscreen: boolean;
} {
  const { isFullscreen, safeAreaInset, contentSafeAreaInset, platform, isMobile } =
    useTelegramSDK();
  const isMobileFullscreen = isFullscreen && isMobile;
  const safe = telegramSafeAreas({
    isMobileFullscreen,
    platform,
    safeAreaInset,
    contentSafeAreaInset,
  });
  const mobile = UI.MOBILE_HEADER_HEIGHT_PX + safe.top;

  return {
    mobile,
    mobileCss: headerHeightCss(mobile, isMobileFullscreen),
    desktop: UI.DESKTOP_HEADER_HEIGHT_PX,
    topSafeArea: safe.top,
    bottomSafeArea: safe.bottom,
    isMobileFullscreen,
  };
}
