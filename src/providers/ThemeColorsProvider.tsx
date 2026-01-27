import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { themeColorsApi } from '../api/themeColors';
import { DEFAULT_THEME_COLORS } from '../types/theme';
import { applyThemeColors } from '../hooks/useThemeColors';

interface ThemeColorsProviderProps {
  children: React.ReactNode;
}

export function ThemeColorsProvider({ children }: ThemeColorsProviderProps) {
  const { data: colors } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Apply colors on mount and when they change
  useEffect(() => {
    applyThemeColors(colors || DEFAULT_THEME_COLORS);
  }, [colors]);

  return <>{children}</>;
}
