import { useState, useEffect, useCallback } from 'react';
import { EnabledThemes, DEFAULT_ENABLED_THEMES } from '../types/theme';
import { themeColorsApi } from '../api/themeColors';

type Theme = 'dark' | 'light';

const THEME_KEY = 'cabinet-theme';
const ENABLED_THEMES_KEY = 'cabinet-enabled-themes';

// Fetch enabled themes from API
async function fetchEnabledThemes(): Promise<EnabledThemes> {
  try {
    const data = await themeColorsApi.getEnabledThemes();
    // Cache in localStorage for faster subsequent loads
    localStorage.setItem(ENABLED_THEMES_KEY, JSON.stringify(data));
    return data;
  } catch {
    // Ignore errors, use cached or default
  }
  // Try to get from cache
  const cached = localStorage.getItem(ENABLED_THEMES_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Ignore parse errors
    }
  }
  return DEFAULT_ENABLED_THEMES;
}

// Get cached enabled themes synchronously
function getCachedEnabledThemes(): EnabledThemes {
  const cached = localStorage.getItem(ENABLED_THEMES_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Ignore parse errors
    }
  }
  return DEFAULT_ENABLED_THEMES;
}

// Custom event for same-tab updates
const ENABLED_THEMES_CHANGED_EVENT = 'enabledThemesChanged';

// Update cache (called from admin settings)
export function updateEnabledThemesCache(themes: EnabledThemes) {
  localStorage.setItem(ENABLED_THEMES_KEY, JSON.stringify(themes));
  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new CustomEvent(ENABLED_THEMES_CHANGED_EVENT, { detail: themes }));
}

export function useTheme() {
  const [enabledThemes, setEnabledThemes] = useState<EnabledThemes>(getCachedEnabledThemes);
  const [isLoading, setIsLoading] = useState(true);

  const [theme, setThemeState] = useState<Theme>(() => {
    const enabled = getCachedEnabledThemes();

    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored === 'light' && enabled.light) {
        return 'light';
      }
      if (stored === 'dark' && enabled.dark) {
        return 'dark';
      }
      // If stored theme is disabled, use the enabled one
      if (stored && !enabled[stored]) {
        return enabled.dark ? 'dark' : 'light';
      }
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: light)').matches && enabled.light) {
        return 'light';
      }
    }
    // Default to dark if enabled, otherwise light
    return enabled.dark ? 'dark' : 'light';
  });

  // Fetch enabled themes on mount
  useEffect(() => {
    fetchEnabledThemes().then((data) => {
      setEnabledThemes(data);
      setIsLoading(false);
      // If current theme is disabled, switch to enabled one
      if (!data[theme]) {
        const newTheme = data.dark ? 'dark' : 'light';
        setThemeState(newTheme);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for localStorage changes (when admin updates enabled themes from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ENABLED_THEMES_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue) as EnabledThemes;
          setEnabledThemes(data);
          // If current theme is now disabled, switch to enabled one
          if (!data[theme]) {
            const newTheme = data.dark ? 'dark' : 'light';
            setThemeState(newTheme);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [theme]);

  // Listen for same-tab enabled themes changes (from admin settings)
  useEffect(() => {
    const handleEnabledThemesChange = (e: CustomEvent<EnabledThemes>) => {
      const data = e.detail;
      setEnabledThemes(data);
      // If current theme is now disabled, switch to enabled one
      if (!data[theme]) {
        const newTheme = data.dark ? 'dark' : 'light';
        setThemeState(newTheme);
      }
    };

    window.addEventListener(
      ENABLED_THEMES_CHANGED_EVENT,
      handleEnabledThemesChange as EventListener,
    );
    return () =>
      window.removeEventListener(
        ENABLED_THEMES_CHANGED_EVENT,
        handleEnabledThemesChange as EventListener,
      );
  }, [theme]);

  // Apply theme to document - also check if theme is disabled and switch
  useEffect(() => {
    const root = document.documentElement;

    // If current theme is disabled, switch to the enabled one
    if (!enabledThemes[theme]) {
      const newTheme = enabledThemes.dark ? 'dark' : 'light';
      if (newTheme !== theme) {
        setThemeState(newTheme);
        return; // Will re-run with correct theme
      }
    }

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    localStorage.setItem(THEME_KEY, theme);
  }, [theme, enabledThemes]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(THEME_KEY);
      // Only auto-switch if user hasn't set a preference and theme is enabled
      if (!stored) {
        const newTheme = e.matches ? 'light' : 'dark';
        if (enabledThemes[newTheme]) {
          setThemeState(newTheme);
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enabledThemes]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      // Only allow setting if theme is enabled
      if (enabledThemes[newTheme]) {
        setThemeState(newTheme);
      }
    },
    [enabledThemes],
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      // Only toggle if the new theme is enabled
      if (enabledThemes[newTheme]) {
        return newTheme;
      }
      return prev;
    });
  }, [enabledThemes]);

  const isDark = theme === 'dark';
  const isLight = theme === 'light';

  // Check if theme switching is available (both themes enabled and loaded)
  const canToggle = !isLoading && enabledThemes.dark && enabledThemes.light;

  // Refresh enabled themes from API
  const refreshEnabledThemes = useCallback(() => {
    fetchEnabledThemes().then((data) => {
      setEnabledThemes(data);
      if (!data[theme]) {
        const newTheme = data.dark ? 'dark' : 'light';
        setThemeState(newTheme);
      }
    });
  }, [theme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
    enabledThemes,
    canToggle,
    isLoading,
    refreshEnabledThemes,
  };
}
