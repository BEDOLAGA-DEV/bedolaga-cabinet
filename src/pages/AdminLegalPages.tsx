import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminLegalPagesApi,
  type FaqPageItem,
  type FaqSettingItem,
  type LegalDisplayMode,
} from '../api/adminLegalPages';
import { AdminBackButton } from '../components/admin';
import { Toggle } from '../components/admin/Toggle';
import { useHapticFeedback } from '../platform/hooks/useHaptic';
import { useDestructiveConfirm } from '../platform/hooks/useNativeDialog';
import { cn } from '../lib/utils';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from '@/components/icons';

type LegalTab = 'privacy' | 'offer' | 'rules' | 'faq';

const DISPLAY_MODES: LegalDisplayMode[] = ['bot', 'web', 'both'];

function extractErrorDetail(err: unknown): string | null {
  const error = err as { response?: { data?: { detail?: unknown } } };
  const detail = error.response?.data?.detail;
  return typeof detail === 'string' ? detail : null;
}

function DisplayModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: LegalDisplayMode;
  onChange: (mode: LegalDisplayMode) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="label">{t('admin.legalPages.displayMode')}</label>
      <div className="flex gap-1" role="radiogroup">
        {DISPLAY_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={value === mode}
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={cn(
              'min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              value === mode
                ? 'bg-accent-500 text-on-accent'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {t(`admin.legalPages.displayModes.${mode}`)}
          </button>
        ))}
      </div>
      {disabled && (
        <p className="mt-1.5 text-xs text-dark-500">{t('admin.legalPages.displayModeLocked')}</p>
      )}
    </div>
  );
}

function LanguageTabs({
  languages,
  active,
  onChange,
}: {
  languages: string[];
  active: string;
  onChange: (lang: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="label">{t('admin.legalPages.language')}</label>
      <div className="flex flex-wrap gap-1">
        {languages.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => onChange(lang)}
            className={cn(
              'min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium uppercase transition-colors',
              active === lang
                ? 'bg-accent-500 text-on-accent'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100',
            )}
          >
            {lang}
          </button>
        ))}
      </div>
    </div>
  );
}

function DocumentEditor({
  kind,
  onDirtyChange,
}: {
  kind: 'privacy-policy' | 'public-offer';
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const haptic = useHapticFeedback();
  const [displayMode, setDisplayMode] = useState<LegalDisplayMode>('both');
  const [contents, setContents] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [activeLang, setActiveLang] = useState('ru');
  const [populated, setPopulated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'legal-pages', kind],
    queryFn: () =>
      kind === 'privacy-policy'
        ? adminLegalPagesApi.getPrivacyPolicy()
        : adminLegalPagesApi.getPublicOffer(),
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!data || isFetching || populated) return;
    setDisplayMode(data.display_mode);
    const nextContents: Record<string, string> = {};
    const nextEnabled: Record<string, boolean> = {};
    for (const item of data.items) {
      nextContents[item.language] = item.content;
      nextEnabled[item.language] = item.is_enabled;
    }
    setContents(nextContents);
    setEnabled(nextEnabled);
    if (data.items.length > 0 && !data.items.some((item) => item.language === 'ru')) {
      setActiveLang(data.items[0].language);
    }
    setPopulated(true);
  }, [data, isFetching, populated]);

  const isDirty =
    populated &&
    !!data &&
    (displayMode !== data.display_mode ||
      data.items.some(
        (item) =>
          (contents[item.language] ?? '') !== item.content ||
          (enabled[item.language] ?? false) !== item.is_enabled,
      ));

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(data?.display_mode_env_locked ? {} : { display_mode: displayMode }),
        items: Object.keys(contents).map((language) => ({
          language,
          content: contents[language] ?? '',
          is_enabled: enabled[language] ?? false,
        })),
      };
      return kind === 'privacy-policy'
        ? adminLegalPagesApi.updatePrivacyPolicy(payload)
        : adminLegalPagesApi.updatePublicOffer(payload);
    },
    onSuccess: () => {
      haptic.success();
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'legal-pages', kind] });
    },
    onError: (err) => {
      haptic.error();
      setSaveError(extractErrorDetail(err) ?? t('admin.legalPages.saveError'));
    },
  });

  if (isLoading || !data) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  const languages = data.items.map((item) => item.language);

  return (
    <div className="space-y-5">
      <DisplayModeSelector
        value={displayMode}
        onChange={setDisplayMode}
        disabled={data.display_mode_env_locked}
      />
      <LanguageTabs languages={languages} active={activeLang} onChange={setActiveLang} />
      <div className="flex items-center gap-3">
        <Toggle
          checked={enabled[activeLang] ?? false}
          onChange={() => setEnabled((prev) => ({ ...prev, [activeLang]: !prev[activeLang] }))}
          aria-label={t('admin.legalPages.enabled')}
        />
        <span className="text-sm text-dark-300">{t('admin.legalPages.enabled')}</span>
      </div>
      <div>
        <label className="label">{t('admin.legalPages.content')}</label>
        <textarea
          value={contents[activeLang] ?? ''}
          onChange={(e) => {
            setSaveError(null);
            setContents((prev) => ({ ...prev, [activeLang]: e.target.value }));
          }}
          rows={16}
          className="input min-h-[320px] w-full font-mono text-sm"
          placeholder={t('admin.legalPages.contentPlaceholder')}
        />
      </div>
      {saveError && <p className="text-sm text-error-400">{saveError}</p>}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="min-h-[44px] rounded-lg bg-accent-500 px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-600 disabled:opacity-50"
      >
        {saveMutation.isPending ? t('admin.legalPages.saving') : t('admin.legalPages.save')}
      </button>
    </div>
  );
}

function RulesEditor({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const haptic = useHapticFeedback();
  const [displayMode, setDisplayMode] = useState<LegalDisplayMode>('both');
  const [contents, setContents] = useState<Record<string, string>>({});
  const [activeLang, setActiveLang] = useState('ru');
  const [populated, setPopulated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'legal-pages', 'rules'],
    queryFn: adminLegalPagesApi.getRules,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!data || isFetching || populated) return;
    setDisplayMode(data.display_mode);
    const nextContents: Record<string, string> = {};
    for (const item of data.items) {
      nextContents[item.language] = item.content;
    }
    setContents(nextContents);
    if (data.items.length > 0 && !data.items.some((item) => item.language === 'ru')) {
      setActiveLang(data.items[0].language);
    }
    setPopulated(true);
  }, [data, isFetching, populated]);

  const isDirty =
    populated &&
    !!data &&
    (displayMode !== data.display_mode ||
      data.items.some((item) => (contents[item.language] ?? '') !== item.content));

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminLegalPagesApi.updateRules({
        ...(data?.display_mode_env_locked ? {} : { display_mode: displayMode }),
        items: Object.keys(contents).map((language) => ({
          language,
          content: contents[language] ?? '',
        })),
      }),
    onSuccess: () => {
      haptic.success();
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'legal-pages', 'rules'] });
    },
    onError: (err) => {
      haptic.error();
      setSaveError(extractErrorDetail(err) ?? t('admin.legalPages.saveError'));
    },
  });

  if (isLoading || !data) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  const languages = data.items.map((item) => item.language);

  return (
    <div className="space-y-5">
      <DisplayModeSelector
        value={displayMode}
        onChange={setDisplayMode}
        disabled={data.display_mode_env_locked}
      />
      <LanguageTabs languages={languages} active={activeLang} onChange={setActiveLang} />
      <div>
        <label className="label">{t('admin.legalPages.content')}</label>
        <textarea
          value={contents[activeLang] ?? ''}
          onChange={(e) => {
            setSaveError(null);
            setContents((prev) => ({ ...prev, [activeLang]: e.target.value }));
          }}
          rows={16}
          className="input min-h-[320px] w-full font-mono text-sm"
          placeholder={t('admin.legalPages.contentPlaceholder')}
        />
      </div>
      {saveError && <p className="text-sm text-error-400">{saveError}</p>}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="min-h-[44px] rounded-lg bg-accent-500 px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-600 disabled:opacity-50"
      >
        {saveMutation.isPending ? t('admin.legalPages.saving') : t('admin.legalPages.save')}
      </button>
    </div>
  );
}

function FaqQuestionRow({
  page,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSaved,
  onDirtyChange,
}: {
  page: FaqPageItem;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSaved: () => void;
  onDirtyChange: (id: number, dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const haptic = useHapticFeedback();
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [isActive, setIsActive] = useState(page.is_active);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = title !== page.title || content !== page.content || isActive !== page.is_active;

  useEffect(() => {
    onDirtyChange(page.id, isDirty);
    return () => onDirtyChange(page.id, false);
  }, [page.id, isDirty, onDirtyChange]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminLegalPagesApi.updateFaqPage(page.id, { title, content, is_active: isActive }),
    onSuccess: () => {
      haptic.success();
      setSaveError(null);
      onSaved();
    },
    onError: (err) => {
      haptic.error();
      setSaveError(extractErrorDetail(err) ?? t('admin.legalPages.saveError'));
    },
  });

  return (
    <div className="space-y-3 rounded-xl border border-dark-700 bg-dark-800/50 p-4">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => {
            setSaveError(null);
            setTitle(e.target.value);
          }}
          className="input flex-1"
          placeholder={t('admin.legalPages.questionTitle')}
        />
        <Toggle
          checked={isActive}
          onChange={() => setIsActive((v) => !v)}
          aria-label={t('admin.legalPages.active')}
        />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-30"
          aria-label={t('admin.legalPages.moveUp')}
        >
          <ChevronUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-30"
          aria-label={t('admin.legalPages.moveDown')}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-error-500/10 hover:text-error-400"
          aria-label={t('admin.legalPages.delete')}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => {
          setSaveError(null);
          setContent(e.target.value);
        }}
        rows={4}
        className="input w-full font-mono text-sm"
        placeholder={t('admin.legalPages.questionContent')}
      />
      {saveError && <p className="text-sm text-error-400">{saveError}</p>}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="min-h-[44px] rounded-lg bg-dark-700 px-5 py-2 text-sm font-medium text-dark-100 transition-colors hover:bg-dark-600 disabled:opacity-50"
      >
        {saveMutation.isPending ? t('admin.legalPages.saving') : t('admin.legalPages.save')}
      </button>
    </div>
  );
}

function FaqEditor({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const haptic = useHapticFeedback();
  const confirm = useDestructiveConfirm();
  const [displayMode, setDisplayMode] = useState<LegalDisplayMode>('both');
  const [activeLang, setActiveLang] = useState('ru');
  const [populated, setPopulated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirtyRows, setDirtyRows] = useState<number[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'legal-pages', 'faq'],
    queryFn: adminLegalPagesApi.getFaq,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!data || isFetching || populated) return;
    setDisplayMode(data.display_mode);
    if (data.settings.length > 0 && !data.settings.some((s) => s.language === 'ru')) {
      setActiveLang(data.settings[0].language);
    }
    setPopulated(true);
  }, [data, isFetching, populated]);

  const handleRowDirtyChange = useCallback((id: number, dirty: boolean) => {
    setDirtyRows((prev) => {
      if (dirty) return prev.includes(id) ? prev : [...prev, id];
      return prev.includes(id) ? prev.filter((rowId) => rowId !== id) : prev;
    });
  }, []);

  const hasDirtyRows = dirtyRows.length > 0;

  useEffect(() => {
    onDirtyChange(hasDirtyRows);
  }, [hasDirtyRows, onDirtyChange]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'legal-pages', 'faq'] });

  const settingsMutation = useMutation({
    mutationFn: (payload: { display_mode?: LegalDisplayMode; settings?: FaqSettingItem[] }) =>
      adminLegalPagesApi.updateFaq(payload),
    onSuccess: (resp) => {
      haptic.success();
      setSaveError(null);
      queryClient.setQueryData(['admin', 'legal-pages', 'faq'], resp);
    },
    onError: (err) => {
      haptic.error();
      setSaveError(extractErrorDetail(err) ?? t('admin.legalPages.saveError'));
      if (data) setDisplayMode(data.display_mode);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminLegalPagesApi.createFaqPage({
        language: activeLang,
        title: t('admin.legalPages.newQuestion'),
        content: '',
      }),
    onSuccess: () => {
      haptic.success();
      setSaveError(null);
      invalidate();
    },
    onError: (err) => {
      haptic.error();
      setSaveError(extractErrorDetail(err) ?? t('admin.legalPages.saveError'));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ a, b }: { a: FaqPageItem; b: FaqPageItem }) => {
      await adminLegalPagesApi.updateFaqPage(a.id, { display_order: b.display_order });
      try {
        await adminLegalPagesApi.updateFaqPage(b.id, { display_order: a.display_order });
      } catch (err) {
        await adminLegalPagesApi
          .updateFaqPage(a.id, { display_order: a.display_order })
          .catch(() => {});
        throw err;
      }
    },
    onSuccess: () => {
      haptic.success();
      setSaveError(null);
    },
    onError: (err) => {
      haptic.error();
      setSaveError(extractErrorDetail(err) ?? t('admin.legalPages.saveError'));
    },
    onSettled: () => {
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminLegalPagesApi.deleteFaqPage(id),
    onSuccess: () => {
      haptic.success();
      setSaveError(null);
      invalidate();
    },
    onError: (err) => {
      haptic.error();
      setSaveError(extractErrorDetail(err) ?? t('admin.legalPages.saveError'));
    },
  });

  if (isLoading || !data) {
    return <div className="skeleton h-64 w-full rounded-xl" />;
  }

  const languages = data.settings.map((s) => s.language);
  const langEnabled = data.settings.find((s) => s.language === activeLang)?.is_enabled ?? false;
  const pages = data.pages.filter((p) => p.language === activeLang);

  return (
    <div className="space-y-5">
      <DisplayModeSelector
        value={displayMode}
        onChange={(mode) => {
          setDisplayMode(mode);
          settingsMutation.mutate({ display_mode: mode });
        }}
        disabled={data.display_mode_env_locked}
      />
      <LanguageTabs
        languages={languages}
        active={activeLang}
        onChange={async (lang) => {
          if (lang === activeLang) return;
          if (hasDirtyRows && !(await confirm(t('admin.legalPages.unsavedWarning')))) return;
          setActiveLang(lang);
        }}
      />
      <div className="flex items-center gap-3">
        <Toggle
          checked={langEnabled}
          onChange={() =>
            settingsMutation.mutate({
              settings: [{ language: activeLang, is_enabled: !langEnabled }],
            })
          }
          disabled={settingsMutation.isPending}
          aria-label={t('admin.legalPages.enabled')}
        />
        <span className="text-sm text-dark-300">{t('admin.legalPages.enabled')}</span>
      </div>
      {saveError && <p className="text-sm text-error-400">{saveError}</p>}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-dark-200">{t('admin.legalPages.faqPages')}</h2>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            <PlusIcon />
            <span className="hidden sm:inline">{t('admin.legalPages.addQuestion')}</span>
          </button>
        </div>
        {pages.length === 0 ? (
          <p className="rounded-xl border border-dark-700 bg-dark-800/50 p-6 text-center text-sm text-dark-400">
            {t('admin.legalPages.noQuestions')}
          </p>
        ) : (
          pages.map((page, index) => (
            <FaqQuestionRow
              key={page.id}
              page={page}
              canMoveUp={index > 0 && !reorderMutation.isPending}
              canMoveDown={index < pages.length - 1 && !reorderMutation.isPending}
              onMoveUp={() => reorderMutation.mutate({ a: page, b: pages[index - 1] })}
              onMoveDown={() => reorderMutation.mutate({ a: page, b: pages[index + 1] })}
              onDelete={async () => {
                const confirmed = await confirm(t('admin.legalPages.confirmDeleteQuestion'));
                if (confirmed) deleteMutation.mutate(page.id);
              }}
              onSaved={invalidate}
              onDirtyChange={handleRowDirtyChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminLegalPages() {
  const { t } = useTranslation();
  const confirm = useDestructiveConfirm();
  const [activeTab, setActiveTab] = useState<LegalTab>('privacy');
  const [dirty, setDirty] = useState(false);

  const handleTabChange = async (tab: LegalTab) => {
    if (tab === activeTab) return;
    if (dirty && !(await confirm(t('admin.legalPages.unsavedWarning')))) return;
    setDirty(false);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/info-pages" />
        <div>
          <h1 className="text-xl font-bold text-dark-100">{t('admin.legalPages.title')}</h1>
          <p className="text-sm text-dark-400">{t('admin.legalPages.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {(['privacy', 'offer', 'rules', 'faq'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={cn(
              'min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-accent-500 text-on-accent'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100',
            )}
          >
            {t(`admin.legalPages.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {activeTab === 'privacy' && (
        <DocumentEditor key="privacy" kind="privacy-policy" onDirtyChange={setDirty} />
      )}
      {activeTab === 'offer' && (
        <DocumentEditor key="offer" kind="public-offer" onDirtyChange={setDirty} />
      )}
      {activeTab === 'rules' && <RulesEditor onDirtyChange={setDirty} />}
      {activeTab === 'faq' && <FaqEditor onDirtyChange={setDirty} />}
    </div>
  );
}
