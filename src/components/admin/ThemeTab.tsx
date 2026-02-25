import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { themeColorsApi } from '../../api/themeColors';
import { DEFAULT_THEME_COLORS, ThemeColors } from '../../types/theme';
import { ColorPicker } from '../ColorPicker';
import { applyThemeColors } from '../../hooks/useThemeColors';
import { updateEnabledThemesCache } from '../../hooks/useTheme';
import { MoonIcon, SunIcon, ChevronDownIcon } from './icons';
import { Toggle } from './Toggle';
import { THEME_PRESETS } from './constants';

function colorsEqual(a: ThemeColors, b: ThemeColors): boolean {
  return (
    a.accent === b.accent &&
    a.darkBackground === b.darkBackground &&
    a.darkSurface === b.darkSurface &&
    a.darkText === b.darkText &&
    a.darkTextSecondary === b.darkTextSecondary &&
    a.lightBackground === b.lightBackground &&
    a.lightSurface === b.lightSurface &&
    a.lightText === b.lightText &&
    a.lightTextSecondary === b.lightTextSecondary &&
    a.success === b.success &&
    a.warning === b.warning &&
    a.error === b.error
  );
}

export function ThemeTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['presets']));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Queries
  const { data: serverColors } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
  });

  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
  });

  // Local draft state
  const [draftColors, setDraftColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const savedColorsRef = useRef<ThemeColors>(DEFAULT_THEME_COLORS);
  const draftColorsRef = useRef(draftColors);
  draftColorsRef.current = draftColors;

  // Sync server data into draft and saved snapshot when it arrives
  useEffect(() => {
    if (serverColors) {
      const colors: ThemeColors = {
        accent: serverColors.accent,
        darkBackground: serverColors.darkBackground,
        darkSurface: serverColors.darkSurface,
        darkText: serverColors.darkText,
        darkTextSecondary: serverColors.darkTextSecondary,
        lightBackground: serverColors.lightBackground,
        lightSurface: serverColors.lightSurface,
        lightText: serverColors.lightText,
        lightTextSecondary: serverColors.lightTextSecondary,
        success: serverColors.success,
        warning: serverColors.warning,
        error: serverColors.error,
      };
      // Only sync if saved snapshot matches current draft (no unsaved changes)
      if (
        colorsEqual(savedColorsRef.current, draftColorsRef.current) ||
        colorsEqual(savedColorsRef.current, DEFAULT_THEME_COLORS)
      ) {
        setDraftColors(colors);
        savedColorsRef.current = colors;
      }
    }
  }, [serverColors]);

  const hasUnsavedChanges = !colorsEqual(draftColors, savedColorsRef.current);

  // Mutations
  const updateColorsMutation = useMutation({
    mutationFn: themeColorsApi.updateColors,
    onSuccess: (data) => {
      const colors: ThemeColors = {
        accent: data.accent,
        darkBackground: data.darkBackground,
        darkSurface: data.darkSurface,
        darkText: data.darkText,
        darkTextSecondary: data.darkTextSecondary,
        lightBackground: data.lightBackground,
        lightSurface: data.lightSurface,
        lightText: data.lightText,
        lightTextSecondary: data.lightTextSecondary,
        success: data.success,
        warning: data.warning,
        error: data.error,
      };
      savedColorsRef.current = colors;
      setDraftColors(colors);
      applyThemeColors(colors);
      queryClient.setQueryData(['theme-colors'], data);
    },
  });

  const resetColorsMutation = useMutation({
    mutationFn: themeColorsApi.resetColors,
    onSuccess: (data) => {
      const colors: ThemeColors = {
        accent: data.accent,
        darkBackground: data.darkBackground,
        darkSurface: data.darkSurface,
        darkText: data.darkText,
        darkTextSecondary: data.darkTextSecondary,
        lightBackground: data.lightBackground,
        lightSurface: data.lightSurface,
        lightText: data.lightText,
        lightTextSecondary: data.lightTextSecondary,
        success: data.success,
        warning: data.warning,
        error: data.error,
      };
      savedColorsRef.current = colors;
      setDraftColors(colors);
      applyThemeColors(colors);
      queryClient.setQueryData(['theme-colors'], data);
    },
  });

  const updateEnabledThemesMutation = useMutation({
    mutationFn: themeColorsApi.updateEnabledThemes,
    onSuccess: (data) => {
      updateEnabledThemesCache(data);
      queryClient.invalidateQueries({ queryKey: ['enabled-themes'] });
    },
  });

  // Throttle applyThemeColors to once per animation frame
  const rafRef = useRef(0);
  const querySyncRef = useRef(0);

  const updateDraftColor = useCallback(
    (key: keyof ThemeColors, value: string) => {
      setDraftColors((prev) => {
        const next = { ...prev, [key]: value };

        // Throttle CSS variable updates to 1x per frame
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          applyThemeColors(next);
        });

        // Debounce query cache update (triggers re-renders of other components)
        clearTimeout(querySyncRef.current);
        querySyncRef.current = window.setTimeout(() => {
          queryClient.setQueryData(['theme-colors'], next);
        }, 150);

        return next;
      });
    },
    [queryClient],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(querySyncRef.current);
    };
  }, []);

  // Apply a full preset and auto-save to server
  const applyPreset = useCallback(
    (colors: Partial<ThemeColors>) => {
      setDraftColors((prev) => {
        const next = { ...prev, ...colors };
        // Preset is a one-shot action — apply immediately (no throttle needed)
        applyThemeColors(next);
        queryClient.setQueryData(['theme-colors'], next);
        // Auto-save preset to server so it persists across navigation
        updateColorsMutation.mutate(next);
        return next;
      });
    },
    [queryClient, updateColorsMutation],
  );

  // Cancel: revert draft to saved
  const handleCancel = useCallback(() => {
    const saved = savedColorsRef.current;
    setDraftColors(saved);
    applyThemeColors(saved);
    queryClient.setQueryData(['theme-colors'], saved);
  }, [queryClient]);

  return (
    <div className="space-y-6">
      {/* Theme toggles */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-dark-100">
          {t('admin.settings.availableThemes')}
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="flex items-center justify-between rounded-xl bg-dark-700/30 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <MoonIcon />
              <span className="text-sm font-medium text-dark-200 sm:text-base">
                {t('admin.settings.darkTheme')}
              </span>
            </div>
            <Toggle
              checked={enabledThemes?.dark ?? true}
              onChange={() => {
                if ((enabledThemes?.dark ?? true) && !(enabledThemes?.light ?? true)) return;
                updateEnabledThemesMutation.mutate({ dark: !(enabledThemes?.dark ?? true) });
              }}
              disabled={updateEnabledThemesMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-dark-700/30 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <SunIcon />
              <span className="text-sm font-medium text-dark-200 sm:text-base">
                {t('admin.settings.lightTheme')}
              </span>
            </div>
            <Toggle
              checked={enabledThemes?.light ?? true}
              onChange={() => {
                if ((enabledThemes?.light ?? true) && !(enabledThemes?.dark ?? true)) return;
                updateEnabledThemesMutation.mutate({ light: !(enabledThemes?.light ?? true) });
              }}
              disabled={updateEnabledThemesMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <button
          onClick={() => toggleSection('presets')}
          className="flex w-full items-center justify-between"
        >
          <h3 className="text-lg font-semibold text-dark-100">
            {t('admin.settings.quickPresets')}
          </h3>
          <div
            className={`transition-transform ${expandedSections.has('presets') ? 'rotate-180' : ''}`}
          >
            <ChevronDownIcon />
          </div>
        </button>

        {expandedSections.has('presets') && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.colors)}
                className="rounded-xl border border-dark-600 p-3 transition-all hover:scale-[1.02] hover:border-dark-500"
                style={{ backgroundColor: preset.colors.darkBackground }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full ring-2 ring-white/20"
                    style={{ backgroundColor: preset.colors.accent }}
                  />
                  <span className="text-xs font-medium" style={{ color: preset.colors.darkText }}>
                    {t(`admin.settings.presets.${preset.id}`)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <div
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: preset.colors.success }}
                  />
                  <div
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: preset.colors.warning }}
                  />
                  <div
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: preset.colors.error }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Colors */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <button
          onClick={() => toggleSection('colors')}
          className="flex w-full items-center justify-between"
        >
          <h3 className="text-lg font-semibold text-dark-100">
            {t('admin.settings.customColors')}
          </h3>
          <div
            className={`transition-transform ${expandedSections.has('colors') ? 'rotate-180' : ''}`}
          >
            <ChevronDownIcon />
          </div>
        </button>

        {expandedSections.has('colors') && (
          <div className="mt-4 space-y-6">
            {/* Accent */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-dark-300">
                {t('admin.settings.accentColor')}
              </h4>
              <ColorPicker
                label={t('theme.accent')}
                value={draftColors.accent}
                onChange={(color) => updateDraftColor('accent', color)}
              />
            </div>

            {/* Dark theme */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
                <MoonIcon /> {t('admin.settings.darkTheme')}
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorPicker
                  label={t('admin.settings.colors.background')}
                  value={draftColors.darkBackground}
                  onChange={(color) => updateDraftColor('darkBackground', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.surface')}
                  value={draftColors.darkSurface}
                  onChange={(color) => updateDraftColor('darkSurface', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.text')}
                  value={draftColors.darkText}
                  onChange={(color) => updateDraftColor('darkText', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.textSecondary')}
                  value={draftColors.darkTextSecondary}
                  onChange={(color) => updateDraftColor('darkTextSecondary', color)}
                />
              </div>
            </div>

            {/* Light theme */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
                <SunIcon /> {t('admin.settings.lightTheme')}
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorPicker
                  label={t('admin.settings.colors.background')}
                  value={draftColors.lightBackground}
                  onChange={(color) => updateDraftColor('lightBackground', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.surface')}
                  value={draftColors.lightSurface}
                  onChange={(color) => updateDraftColor('lightSurface', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.text')}
                  value={draftColors.lightText}
                  onChange={(color) => updateDraftColor('lightText', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.textSecondary')}
                  value={draftColors.lightTextSecondary}
                  onChange={(color) => updateDraftColor('lightTextSecondary', color)}
                />
              </div>
            </div>

            {/* Status colors */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-dark-300">
                {t('admin.settings.statusColors')}
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ColorPicker
                  label={t('admin.settings.colors.success')}
                  value={draftColors.success}
                  onChange={(color) => updateDraftColor('success', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.warning')}
                  value={draftColors.warning}
                  onChange={(color) => updateDraftColor('warning', color)}
                />
                <ColorPicker
                  label={t('admin.settings.colors.error')}
                  value={draftColors.error}
                  onChange={(color) => updateDraftColor('error', color)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save / Cancel — always visible when there are unsaved changes */}
      {hasUnsavedChanges && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => updateColorsMutation.mutate(draftColors)}
            disabled={updateColorsMutation.isPending}
            className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {updateColorsMutation.isPending
              ? t('common.saving', t('common.save'))
              : t('common.save')}
          </button>
          <button
            onClick={handleCancel}
            disabled={updateColorsMutation.isPending}
            className="rounded-xl bg-dark-700 px-4 py-2 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Reset all colors */}
      <div className="flex justify-end">
        <button
          onClick={() => resetColorsMutation.mutate()}
          disabled={resetColorsMutation.isPending}
          className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-50"
        >
          {t('admin.settings.resetAllColors')}
        </button>
      </div>
    </div>
  );
}
