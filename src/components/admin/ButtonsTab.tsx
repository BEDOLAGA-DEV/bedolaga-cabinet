import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buttonStylesApi,
  ButtonStylesConfig,
  DEFAULT_BUTTON_STYLES,
  BUTTON_SECTIONS,
  ButtonSection,
} from '../../api/buttonStyles';

type StyleValue = 'primary' | 'success' | 'danger';

const STYLE_OPTIONS: { value: StyleValue; colorClass: string }[] = [
  { value: 'primary', colorClass: 'bg-blue-500' },
  { value: 'success', colorClass: 'bg-green-500' },
  { value: 'danger', colorClass: 'bg-red-500' },
];

function stylesEqual(a: ButtonStylesConfig, b: ButtonStylesConfig): boolean {
  for (const section of BUTTON_SECTIONS) {
    if (a[section].style !== b[section].style) return false;
    if (a[section].icon_custom_emoji_id !== b[section].icon_custom_emoji_id) return false;
  }
  return true;
}

export function ButtonsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: serverStyles } = useQuery({
    queryKey: ['button-styles'],
    queryFn: buttonStylesApi.getStyles,
  });

  const [draftStyles, setDraftStyles] = useState<ButtonStylesConfig>(DEFAULT_BUTTON_STYLES);
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
  });

  const resetMutation = useMutation({
    mutationFn: buttonStylesApi.resetStyles,
    onSuccess: (data) => {
      savedStylesRef.current = data;
      setDraftStyles(data);
      queryClient.setQueryData(['button-styles'], data);
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

  const handleCancel = useCallback(() => {
    setDraftStyles(savedStylesRef.current);
  }, []);

  const handleSave = useCallback(() => {
    // Build partial update — only send changed sections
    const update: Record<string, Record<string, string>> = {};
    for (const section of BUTTON_SECTIONS) {
      const draft = draftStyles[section];
      const saved = savedStylesRef.current[section];
      if (
        draft.style !== saved.style ||
        draft.icon_custom_emoji_id !== saved.icon_custom_emoji_id
      ) {
        update[section] = {};
        if (draft.style !== saved.style) {
          update[section].style = draft.style;
        }
        if (draft.icon_custom_emoji_id !== saved.icon_custom_emoji_id) {
          update[section].icon_custom_emoji_id = draft.icon_custom_emoji_id;
        }
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
          return (
            <div
              key={section}
              className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-dark-100">
                    {t(`admin.buttons.sections.${section}`)}
                  </h4>
                  <p className="mt-0.5 text-xs text-dark-400">
                    {t(`admin.buttons.descriptions.${section}`)}
                  </p>
                </div>
                {/* Live preview chip */}
                <div
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                    cfg.style === 'success'
                      ? 'bg-green-500'
                      : cfg.style === 'danger'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                  }`}
                >
                  {t(`admin.buttons.styles.${cfg.style}`)}
                </div>
              </div>

              {/* Color selector chips */}
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium text-dark-300">
                  {t('admin.buttons.color')}
                </label>
                <div className="flex gap-2">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateSection(section, 'style', opt.value)}
                      className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
                        cfg.style === opt.value
                          ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                          : 'border-dark-600 bg-dark-700/50 text-dark-300 hover:border-dark-500'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${opt.colorClass}`} />
                      {t(`admin.buttons.styles.${opt.value}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji ID input */}
              <div>
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
            {updateMutation.isPending ? t('common.saving', t('common.save')) : t('common.save')}
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
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-50"
        >
          {t('admin.buttons.resetAll')}
        </button>
      </div>
    </div>
  );
}
