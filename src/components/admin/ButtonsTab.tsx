import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buttonStylesApi,
  ButtonStylesConfig,
  DEFAULT_BUTTON_STYLES,
  BUTTON_SECTIONS,
  ButtonSection,
  BOT_LOCALES,
} from '../../api/buttonStyles';
import { Toggle } from './Toggle';
import { useNotify } from '../../platform/hooks/useNotify';

type StyleValue = 'primary' | 'success' | 'danger' | 'default';

const STYLE_OPTIONS: { value: StyleValue; colorClass: string }[] = [
  { value: 'default', colorClass: 'bg-dark-500' },
  { value: 'primary', colorClass: 'bg-blue-500' },
  { value: 'success', colorClass: 'bg-green-500' },
  { value: 'danger', colorClass: 'bg-red-500' },
];

function labelsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  for (const locale of BOT_LOCALES) {
    if ((a[locale] || '') !== (b[locale] || '')) return false;
  }
  return true;
}

function stylesEqual(a: ButtonStylesConfig, b: ButtonStylesConfig): boolean {
  for (const section of BUTTON_SECTIONS) {
    if (a[section].style !== b[section].style) return false;
    if (a[section].icon_custom_emoji_id !== b[section].icon_custom_emoji_id) return false;
    if (a[section].enabled !== b[section].enabled) return false;
    if (!labelsEqual(a[section].labels, b[section].labels)) return false;
  }
  return true;
}

export function ButtonsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const notify = useNotify();

  const { data: serverStyles } = useQuery({
    queryKey: ['button-styles'],
    queryFn: buttonStylesApi.getStyles,
  });

  const [draftStyles, setDraftStyles] = useState<ButtonStylesConfig>(DEFAULT_BUTTON_STYLES);
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const savedStylesRef = useRef<ButtonStylesConfig>(DEFAULT_BUTTON_STYLES);
  const draftStylesRef = useRef(draftStyles);
  draftStylesRef.current = draftStyles;

  useEffect(() => {
    if (serverStyles) {
      if (
        stylesEqual(savedStylesRef.current, draftStylesRef.current) ||
        stylesEqual(savedStylesRef.current, DEFAULT_BUTTON_STYLES)
      ) {
        setDraftStyles(serverStyles);
        savedStylesRef.current = serverStyles;
      }
    }
  }, [serverStyles]);

  const hasUnsavedChanges = !stylesEqual(draftStyles, savedStylesRef.current);

  const updateMutation = useMutation({
    mutationFn: buttonStylesApi.updateStyles,
    onSuccess: (data) => {
      savedStylesRef.current = data;
      setDraftStyles(data);
      queryClient.setQueryData(['button-styles'], data);
    },
    onError: () => {
      notify.error(t('common.error'));
    },
  });

  const resetMutation = useMutation({
    mutationFn: buttonStylesApi.resetStyles,
    onSuccess: (data) => {
      savedStylesRef.current = data;
      setDraftStyles(data);
      queryClient.setQueryData(['button-styles'], data);
    },
    onError: () => {
      notify.error(t('common.error'));
    },
  });

  const updateSection = useCallback(
    (section: ButtonSection, field: 'style' | 'icon_custom_emoji_id', value: string) => {
      setDraftStyles((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    },
    [],
  );

  const toggleEnabled = useCallback((section: ButtonSection) => {
    setDraftStyles((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        enabled: !prev[section].enabled,
      },
    }));
  }, []);

  const updateLabel = useCallback((section: ButtonSection, locale: string, value: string) => {
    setDraftStyles((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        labels: {
          ...prev[section].labels,
          [locale]: value,
        },
      },
    }));
  }, []);

  const toggleLabelsExpanded = useCallback((section: string) => {
    setExpandedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDraftStyles(savedStylesRef.current);
  }, []);

  const handleSave = useCallback(() => {
    const update: Record<string, Record<string, unknown>> = {};
    for (const section of BUTTON_SECTIONS) {
      const draft = draftStyles[section];
      const saved = savedStylesRef.current[section];
      const sectionUpdate: Record<string, unknown> = {};
      let changed = false;

      if (draft.style !== saved.style) {
        sectionUpdate.style = draft.style;
        changed = true;
      }
      if (draft.icon_custom_emoji_id !== saved.icon_custom_emoji_id) {
        sectionUpdate.icon_custom_emoji_id = draft.icon_custom_emoji_id;
        changed = true;
      }
      if (draft.enabled !== saved.enabled) {
        sectionUpdate.enabled = draft.enabled;
        changed = true;
      }
      if (!labelsEqual(draft.labels, saved.labels)) {
        const cleanLabels: Record<string, string> = {};
        for (const locale of BOT_LOCALES) {
          cleanLabels[locale] = (draft.labels[locale] || '').trim();
        }
        sectionUpdate.labels = cleanLabels;
        changed = true;
      }

      if (changed) {
        update[section] = sectionUpdate;
      }
    }
    if (Object.keys(update).length > 0) {
      updateMutation.mutate(update);
    }
  }, [draftStyles, updateMutation]);

  return (
    <div className="space-y-6">
      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BUTTON_SECTIONS.map((section) => {
          const cfg = draftStyles[section];
          const isExpanded = expandedLabels.has(section);
          const hasCustomLabels = BOT_LOCALES.some((l) => (cfg.labels[l] || '').trim());

          return (
            <div
              key={section}
              className={`overflow-hidden rounded-2xl border bg-dark-800/50 p-4 transition-colors sm:p-5 ${
                cfg.enabled ? 'border-dark-700/50' : 'border-dark-700/30 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-semibold text-dark-100">
                      {t(`admin.buttons.sections.${section}`)}
                    </h4>
                    {!cfg.enabled && (
                      <span className="shrink-0 rounded bg-dark-600 px-1.5 py-0.5 text-[10px] font-medium text-dark-400">
                        {t('admin.buttons.hidden')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-dark-400">
                    {t(`admin.buttons.descriptions.${section}`)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Live preview chip */}
                  <div
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      cfg.style === 'default'
                        ? 'bg-dark-600 text-dark-300'
                        : cfg.style === 'success'
                          ? 'bg-green-500 text-white'
                          : cfg.style === 'danger'
                            ? 'bg-red-500 text-white'
                            : 'bg-blue-500 text-white'
                    }`}
                  >
                    {t(`admin.buttons.styles.${cfg.style}`)}
                  </div>
                  {/* Enabled toggle */}
                  <Toggle checked={cfg.enabled} onChange={() => toggleEnabled(section)} />
                </div>
              </div>

              {/* Color selector chips */}
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium text-dark-300">
                  {t('admin.buttons.color')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateSection(section, 'style', opt.value)}
                      className={`flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all ${
                        cfg.style === opt.value
                          ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                          : 'border-dark-600 bg-dark-700/50 text-dark-300 hover:border-dark-500'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.colorClass}`} />
                      {t(`admin.buttons.styles.${opt.value}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji ID input */}
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium text-dark-300">
                  {t('admin.buttons.emojiId')}
                </label>
                <input
                  type="text"
                  value={cfg.icon_custom_emoji_id}
                  onChange={(e) => updateSection(section, 'icon_custom_emoji_id', e.target.value)}
                  placeholder={t('admin.buttons.emojiPlaceholder')}
                  className="w-full rounded-lg border border-dark-600 bg-dark-700/50 px-3 py-2 text-sm text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none"
                />
              </div>

              {/* Custom labels */}
              <div>
                <button
                  onClick={() => toggleLabelsExpanded(section)}
                  className="flex w-full items-center justify-between text-xs font-medium text-dark-300 transition-colors hover:text-dark-200"
                >
                  <span className="flex items-center gap-1.5">
                    {t('admin.buttons.customLabels')}
                    {hasCustomLabels && <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />}
                  </span>
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {BOT_LOCALES.map((locale) => (
                      <div key={locale} className="flex items-center gap-2">
                        <span className="w-7 shrink-0 text-center text-[10px] font-semibold uppercase text-dark-500">
                          {locale}
                        </span>
                        <input
                          type="text"
                          value={cfg.labels[locale] || ''}
                          onChange={(e) => updateLabel(section, locale, e.target.value)}
                          placeholder={t('admin.buttons.labelPlaceholder')}
                          maxLength={100}
                          className="w-full rounded-lg border border-dark-600 bg-dark-700/50 px-3 py-1.5 text-sm text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-dark-500">{t('admin.buttons.labelsHint')}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save / Cancel */}
      {hasUnsavedChanges && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          <button
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            className="rounded-xl bg-dark-700 px-4 py-2 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Reset */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (window.confirm(t('admin.buttons.resetConfirm'))) {
              resetMutation.mutate();
            }
          }}
          disabled={resetMutation.isPending}
          className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-50"
        >
          {t('admin.buttons.resetAll')}
        </button>
      </div>
    </div>
  );
}
