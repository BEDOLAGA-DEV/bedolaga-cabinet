import { queryOptions } from '@tanstack/react-query';
import { readThemeColorsHint } from '@/utils/themeColorsHint';
import apiClient from './client';
import {
  type ThemeSettings,
  DEFAULT_THEME_COLORS,
  type EnabledThemes,
  DEFAULT_ENABLED_THEMES,
} from '../types/theme';

export const themeColorsApi = {
  // Get current theme colors (public, no auth required)
  getColors: async (): Promise<ThemeSettings> => {
    try {
      const response = await apiClient.get<ThemeSettings>('/cabinet/branding/colors');
      return response.data;
    } catch {
      // Return default colors if endpoint not available
      return DEFAULT_THEME_COLORS;
    }
  },

  // Update theme colors (admin only)
  updateColors: async (colors: Partial<ThemeSettings>): Promise<ThemeSettings> => {
    const response = await apiClient.patch<ThemeSettings>('/cabinet/branding/colors', colors);
    return response.data;
  },

  // Reset to default colors (admin only)
  resetColors: async (): Promise<ThemeSettings> => {
    const response = await apiClient.post<ThemeSettings>('/cabinet/branding/colors/reset');
    return response.data;
  },

  // Get enabled themes (public, no auth required)
  getEnabledThemes: async (): Promise<EnabledThemes> => {
    try {
      const response = await apiClient.get<EnabledThemes>('/cabinet/branding/themes');
      return response.data;
    } catch {
      return DEFAULT_ENABLED_THEMES;
    }
  },

  // Update enabled themes (admin only)
  updateEnabledThemes: async (themes: Partial<EnabledThemes>): Promise<EnabledThemes> => {
    const response = await apiClient.patch<EnabledThemes>('/cabinet/branding/themes', themes);
    return response.data;
  },
};

export const THEME_COLORS_QUERY_KEY = ['theme-colors'] as const;

/**
 * Единые параметры запроса палитры для всех, кто рисует ею на старте (провайдер,
 * бренд во вкладке). Стартует с подсказки прошлого визита: initialDataUpdatedAt = 0
 * помечает её заведомо устаревшей, запрос на сервер уходит сразу, но первый рендер
 * идёт в операторских цветах, а не в дефолтных.
 */
export function themeColorsQueryOptions() {
  return queryOptions({
    queryKey: THEME_COLORS_QUERY_KEY,
    queryFn: themeColorsApi.getColors,
    initialData: () => readThemeColorsHint()?.colors,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
