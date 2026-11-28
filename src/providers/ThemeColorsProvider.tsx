import { useEffect, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { themeColorsQueryOptions } from '../api/themeColors';
import { DEFAULT_THEME_COLORS } from '../types/theme';
import { applyThemeColors } from '../hooks/useThemeColors';
import { usePlatform } from '@/platform';
import { useTheme } from '../hooks/useTheme';

interface ThemeColorsProviderProps {
  children: React.ReactNode;
}

export function ThemeColorsProvider({ children }: ThemeColorsProviderProps) {
  const { data: colors } = useQuery(themeColorsQueryOptions());

  const { theme: platformTheme, capabilities } = usePlatform();
  const { isDark } = useTheme();

  // Пока идёт стартовая заставка (src/intro/intro.js), шапка и фон Telegram
  // остаются её тёмного цвета: иначе в светлой теме над чёрной заставкой стояла бы
  // светлая полоса. Заставка сообщает о конце событием intro:done.
  const [introDone, setIntroDone] = useState(
    () => !document.documentElement.classList.contains('bc-intro'),
  );
  useEffect(() => {
    if (introDone) return;
    const onDone = () => setIntroDone(true);
    document.addEventListener('intro:done', onDone);
    // Заставка могла закончиться между первым рендером и подпиской.
    if (!document.documentElement.classList.contains('bc-intro')) onDone();
    return () => document.removeEventListener('intro:done', onDone);
  }, [introDone]);

  // Apply colors on mount and when they change
  useEffect(() => {
    applyThemeColors(colors || DEFAULT_THEME_COLORS);
  }, [colors]);

  // Sync Telegram header and bottom bar colors with theme
  const syncTelegramColors = useCallback(() => {
    if (!capabilities.hasThemeSync || !introDone) return;

    const themeColors = colors || DEFAULT_THEME_COLORS;
    // Use surface color for header/bottom bar to match app UI
    const headerColor = isDark ? themeColors.darkSurface : themeColors.lightSurface;
    // Фон клиента под страницей — тот же, что у самой страницы. Иначе на
    // Android всё, что WebView не успел отрисовать, просвечивает цветом
    // клиента: чёрные прямоугольники и «прыгающие» цвета на Xiaomi.
    const pageColor = isDark ? themeColors.darkBackground : themeColors.lightBackground;

    platformTheme.setHeaderColor(headerColor);
    platformTheme.setBottomBarColor(headerColor);
    platformTheme.setBackgroundColor(pageColor);
  }, [capabilities.hasThemeSync, colors, introDone, isDark, platformTheme]);

  // Apply Telegram colors when theme or colors change
  useEffect(() => {
    syncTelegramColors();
  }, [syncTelegramColors]);

  return <>{children}</>;
}
