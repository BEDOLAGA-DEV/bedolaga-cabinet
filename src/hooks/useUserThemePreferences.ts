import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from '@/platform';
import {
  type UserThemePreferences,
  type BorderRadiusPreset,
  type ThemeMode,
  DEFAULT_USER_PREFERENCES,
  BORDER_RADIUS_VALUES,
} from '../types/theme';

const STORAGE_KEY = 'user_theme_preferences';

/**
 * Parse preferences from storage string
 */
function parsePreferences(value: string | null): UserThemePreferences {
  if (!value) return DEFAULT_USER_PREFERENCES;

  try {
    const parsed = JSON.parse(value);
    return {
      theme: parsed.theme ?? DEFAULT_USER_PREFERENCES.theme,
      borderRadius: parsed.borderRadius ?? DEFAULT_USER_PREFERENCES.borderRadius,
      animationsEnabled: parsed.animationsEnabled ?? DEFAULT_USER_PREFERENCES.animationsEnabled,
    };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

/**
 * Apply CSS variables to document
 */
function applyPreferencesToDOM(preferences: UserThemePreferences): void {
  const root = document.documentElement;

  // Apply border radius
  root.style.setProperty('--bento-radius', BORDER_RADIUS_VALUES[preferences.borderRadius]);

  // Apply animations toggle
  if (preferences.animationsEnabled) {
    root.classList.remove('reduce-motion');
  } else {
    root.classList.add('reduce-motion');
  }
}

/**
 * Hook to manage user theme preferences
 * Stores in localStorage and optionally syncs with Telegram CloudStorage
 */
export function useUserThemePreferences() {
  const { cloudStorage, capabilities } = usePlatform();
  const [preferences, setPreferencesState] =
    useState<UserThemePreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      setIsLoading(true);

      try {
        // Try Telegram CloudStorage first if available
        if (capabilities.hasCloudStorage && cloudStorage) {
          const cloudValue = await cloudStorage.getItem(STORAGE_KEY);
          if (cloudValue) {
            const prefs = parsePreferences(cloudValue);
            setPreferencesState(prefs);
            applyPreferencesToDOM(prefs);
            setIsLoading(false);
            return;
          }
        }

        // Fall back to localStorage
        const localValue = localStorage.getItem(STORAGE_KEY);
        const prefs = parsePreferences(localValue);
        setPreferencesState(prefs);
        applyPreferencesToDOM(prefs);
      } catch (error) {
        console.warn('Failed to load theme preferences:', error);
        applyPreferencesToDOM(DEFAULT_USER_PREFERENCES);
      }

      setIsLoading(false);
    }

    loadPreferences();
  }, [cloudStorage, capabilities.hasCloudStorage]);

  // Save preferences
  const savePreferences = useCallback(
    async (newPreferences: UserThemePreferences) => {
      const value = JSON.stringify(newPreferences);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }

      // Sync to Telegram CloudStorage if available
      if (capabilities.hasCloudStorage && cloudStorage) {
        try {
          await cloudStorage.setItem(STORAGE_KEY, value);
        } catch (error) {
          console.warn('Failed to sync to CloudStorage:', error);
        }
      }

      // Apply to DOM
      applyPreferencesToDOM(newPreferences);
      setPreferencesState(newPreferences);
    },
    [cloudStorage, capabilities.hasCloudStorage],
  );

  // Update individual preference
  const updatePreference = useCallback(
    <K extends keyof UserThemePreferences>(key: K, value: UserThemePreferences[K]) => {
      const newPreferences = { ...preferences, [key]: value };
      savePreferences(newPreferences);
    },
    [preferences, savePreferences],
  );

  // Convenience setters
  const setTheme = useCallback(
    (theme: ThemeMode) => updatePreference('theme', theme),
    [updatePreference],
  );

  const setBorderRadius = useCallback(
    (borderRadius: BorderRadiusPreset) => updatePreference('borderRadius', borderRadius),
    [updatePreference],
  );

  const setAnimationsEnabled = useCallback(
    (enabled: boolean) => updatePreference('animationsEnabled', enabled),
    [updatePreference],
  );

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    savePreferences(DEFAULT_USER_PREFERENCES);
  }, [savePreferences]);

  return {
    preferences,
    isLoading,
    setTheme,
    setBorderRadius,
    setAnimationsEnabled,
    updatePreference,
    resetPreferences,
  };
}

/**
 * Hook to get resolved theme (respects system preference when set to 'system')
 */
export function useResolvedTheme() {
  const { preferences } = useUserThemePreferences();
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Get initial system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (preferences.theme === 'system') {
    return systemTheme;
  }

  return preferences.theme;
}
