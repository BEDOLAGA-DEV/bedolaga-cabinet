import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminEmailTemplatesApi,
  EmailTemplateType,
  EmailTemplateDetail,
  EmailTemplateLanguageData,
} from '../api/adminEmailTemplates';
import { AdminBackButton, BackIcon } from '../components/admin';
import { useIsTelegram } from '../platform/hooks/usePlatform';
import { useNotify } from '@/platform';

// Hook to check if on mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

// Icons

const MailIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

const SaveIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);

const ResetIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const LANG_LABELS: Record<string, string> = {
  ru: 'RU',
  en: 'EN',
  zh: 'ZH',
  ua: 'UA',
};

const LANG_FULL_LABELS: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  zh: '中文',
  ua: 'Українська',
};

// ============ Template List View ============

function TemplateCard({
  template,
  currentLang,
  onClick,
}: {
  template: EmailTemplateType;
  currentLang: string;
  onClick: () => void;
}) {
  const label = template.label[currentLang] || template.label['en'] || template.type;
  const description = template.description[currentLang] || template.description['en'] || '';
  const customCount = Object.values(template.languages).filter((l) => l.has_custom).length;

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-dark-700 bg-dark-800 p-3 text-left transition-all duration-200 hover:border-accent-500/50 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-dark-100 transition-colors group-hover:text-accent-400">
            {label}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-dark-400">{description}</p>
        </div>
        <div className="mt-0.5 flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
          {Object.entries(template.languages).map(([lang, status]) => (
            <span
              key={lang}
              className={`inline-flex h-5 w-6 items-center justify-center rounded text-2xs font-medium sm:w-7 ${
                status.has_custom
                  ? 'bg-accent-500/20 text-accent-400 ring-1 ring-accent-500/30'
                  : 'bg-dark-700 text-dark-400'
              }`}
              title={`${LANG_FULL_LABELS[lang] || lang}: ${status.has_custom ? 'Custom' : 'Default'}`}
            >
              {LANG_LABELS[lang] || lang}
            </span>
          ))}
        </div>
      </div>
      {customCount > 0 && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 text-2xs text-accent-400">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            {customCount} custom
          </span>
        </div>
      )}
    </button>
  );
}

// ============ Template Editor ============

function TemplateEditor({
  detail,
  onClose,
  currentLang: interfaceLang,
}: {
  detail: EmailTemplateDetail;
  onClose: () => void;
  currentLang: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const isTelegram = useIsTelegram();
  const isMobile = useIsMobile();
  const isPreviewDisabled = isTelegram || isMobile;

  const [activeLang, setActiveLang] = useState('ru');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const langData: EmailTemplateLanguageData | undefined = detail.languages[activeLang];

  // Load data for current language
  useEffect(() => {
    if (langData) {
      setEditSubject(langData.subject);
      setEditBody(langData.is_default ? langData.body_html : langData.body_html);
      setIsDirty(false);
    }
  }, [activeLang, langData]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Extract body content from full HTML (strip base template wrapper)
  const extractBodyContent = useCallback((html: string): string => {
    // If it's wrapped in the base template, extract just the content div
    const contentMatch = html.match(
      /<div class="content">\s*([\s\S]*?)\s*<\/div>\s*<div class="footer">/,
    );
    if (contentMatch) {
      return contentMatch[1].trim();
    }
    return html;
  }, []);

  // When langData changes (e.g., after refetch), update the body content
  useEffect(() => {
    if (langData) {
      if (langData.is_default) {
        // For default templates, extract just the content portion
        setEditBody(extractBodyContent(langData.body_html));
      } else {
        setEditBody(langData.body_html);
      }
      setEditSubject(langData.subject);
      setIsDirty(false);
    }
  }, [activeLang, langData, extractBodyContent]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      adminEmailTemplatesApi.updateTemplate(detail.notification_type, activeLang, {
        subject: editSubject,
        body_html: editBody,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'email-template', detail.notification_type],
      });
      setIsDirty(false);
      showToast('success', t('admin.emailTemplates.saved'));
    },
    onError: () => {
      showToast('error', t('common.error'));
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: () => adminEmailTemplatesApi.deleteTemplate(detail.notification_type, activeLang),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'email-template', detail.notification_type],
      });
      setIsDirty(false);
      showToast('success', t('admin.emailTemplates.resetted'));
    },
    onError: () => {
      showToast('error', t('common.error'));
    },
  });

  // Send test mutation
  const testMutation = useMutation({
    mutationFn: () =>
      adminEmailTemplatesApi.sendTestEmail(detail.notification_type, {
        language: activeLang,
      }),
    onSuccess: (data) => {
      showToast('success', `${t('admin.emailTemplates.testSent')} → ${data.sent_to}`);
    },
    onError: () => {
      showToast('error', t('common.error'));
    },
  });

  const handleSubjectChange = (value: string) => {
    setEditSubject(value);
    setIsDirty(true);
  };

  const handleBodyChange = (value: string) => {
    setEditBody(value);
    setIsDirty(true);
  };

  const label = detail.label[interfaceLang] || detail.label['en'] || detail.notification_type;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 sm:items-center">
        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
          <button
            onClick={onClose}
            className="mt-0.5 flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-dark-700 sm:mt-0"
          >
            <BackIcon />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-dark-100 sm:text-lg">{label}</h2>
            <p className="line-clamp-2 text-xs text-dark-400">
              {detail.description[interfaceLang] || detail.description['en'] || ''}
            </p>
          </div>
        </div>
        {langData && !langData.is_default && (
          <span className="flex-shrink-0 rounded-full bg-accent-500/15 px-2 py-1 text-2xs font-medium text-accent-400 ring-1 ring-accent-500/25 sm:px-2.5 sm:text-xs">
            Custom
          </span>
        )}
      </div>

      {/* Language tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-dark-900 p-1">
        {Object.keys(detail.languages).map((lang) => {
          const isActive = lang === activeLang;
          const langInfo = detail.languages[lang];
          return (
            <button
              key={lang}
              onClick={() => {
                if (isDirty && !window.confirm(t('admin.emailTemplates.unsavedWarning'))) return;
                setActiveLang(lang);
              }}
              className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-all duration-150 sm:gap-1.5 sm:px-3 sm:text-sm ${
                isActive
                  ? 'bg-dark-700 text-dark-100 shadow-sm'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
              }`}
            >
              <span className="sm:hidden">{LANG_LABELS[lang] || lang}</span>
              <span className="hidden sm:inline">{LANG_FULL_LABELS[lang] || lang}</span>
              {!langInfo.is_default && (
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Subject */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-dark-300">
          {t('admin.emailTemplates.subject')}
        </label>
        <input
          type="text"
          value={editSubject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2.5 text-sm text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          placeholder={t('admin.emailTemplates.subjectPlaceholder')}
        />
      </div>

      {/* Context variables hint */}
      {detail.context_vars.length > 0 && (
        <div className="rounded-lg border border-dark-700 bg-dark-900/60 p-2.5 sm:p-3">
          <p className="mb-1.5 text-xs font-medium text-dark-300">
            {t('admin.emailTemplates.variables')}
          </p>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {detail.context_vars.map((v) => (
              <code
                key={v}
                className="cursor-pointer rounded bg-dark-700 px-2 py-0.5 font-mono text-xs text-accent-400 transition-colors hover:bg-dark-600"
                title={t('admin.emailTemplates.clickToCopy')}
                onClick={() => {
                  navigator.clipboard.writeText(`{${v}}`);
                  showToast('success', `Copied {${v}}`);
                }}
              >
                {`{${v}}`}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Body HTML editor */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-dark-300">
          {t('admin.emailTemplates.body')}
        </label>
        <textarea
          ref={textareaRef}
          value={editBody}
          onChange={(e) => handleBodyChange(e.target.value)}
          rows={12}
          className="min-h-[200px] w-full resize-y rounded-lg border border-dark-600 bg-dark-900 px-3 py-2.5 font-mono text-xs leading-relaxed text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:min-h-[300px] sm:text-sm"
          placeholder="<h2>Title</h2><p>Content...</p>"
          spellCheck={false}
        />
        <p className="mt-1 text-2xs text-dark-500">{t('admin.emailTemplates.bodyHint')}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2"
          >
            <SaveIcon />
            {saveMutation.isPending ? t('common.loading') : t('common.save')}
          </button>

          <button
            onClick={() => {
              if (isPreviewDisabled) {
                notify.warning(
                  t('admin.emailTemplates.previewDesktopOnly'),
                  t('admin.emailTemplates.previewNotAvailable'),
                );
                return;
              }
              navigate(`/admin/email-templates/preview/${detail.notification_type}/${activeLang}`, {
                state: {
                  subject: editSubject,
                  body_html: editBody,
                },
              });
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-dark-700 px-3 py-2.5 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-600 sm:px-4 sm:py-2"
          >
            <EyeIcon />
            {t('admin.emailTemplates.preview')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-dark-700 px-3 py-2.5 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-600 disabled:opacity-40 sm:px-4 sm:py-2"
          >
            <SendIcon />
            {testMutation.isPending ? t('common.loading') : t('admin.emailTemplates.sendTest')}
          </button>

          {langData && !langData.is_default && (
            <button
              onClick={() => {
                if (window.confirm(t('admin.emailTemplates.resetConfirm'))) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-dark-700 px-3 py-2.5 text-sm font-medium text-warning-400 transition-colors hover:bg-dark-600 disabled:opacity-40 sm:ml-auto sm:px-4 sm:py-2"
            >
              <ResetIcon />
              <span className="truncate">{t('admin.emailTemplates.resetDefault')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed left-4 right-4 top-32 z-[100] mx-auto max-w-sm animate-fade-in rounded-xl px-4 py-3 text-center text-sm font-medium shadow-lg sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${
            toast.type === 'success'
              ? 'bg-success-500 text-white'
              : toast.type === 'info'
                ? 'bg-dark-700 text-dark-100 ring-1 ring-dark-600'
                : 'bg-error-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ============ Main Page ============

export default function AdminEmailTemplates() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'ru';
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Fetch template types list
  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ['admin', 'email-templates'],
    queryFn: adminEmailTemplatesApi.getTemplateTypes,
  });

  // Fetch detail for selected type
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'email-template', selectedType],
    queryFn: () => adminEmailTemplatesApi.getTemplate(selectedType!),
    enabled: !!selectedType,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6">
      {/* Page Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <AdminBackButton className="flex-shrink-0 rounded-xl border border-dark-700 bg-dark-800 p-1.5 transition-colors hover:bg-dark-700 sm:p-2" />
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 p-1.5 text-accent-400 sm:p-2">
            <MailIcon />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-dark-100 sm:text-xl">
              {t('admin.emailTemplates.title')}
            </h1>
            <p className="truncate text-xs text-dark-400">
              {t('admin.emailTemplates.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {selectedType && detailData ? (
        <TemplateEditor
          detail={detailData}
          onClose={() => setSelectedType(null)}
          currentLang={currentLang}
        />
      ) : (
        <>
          {/* Template List */}
          {typesLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-dark-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              {typesData?.items.map((template) => (
                <TemplateCard
                  key={template.type}
                  template={template}
                  currentLang={currentLang}
                  onClick={() => setSelectedType(template.type)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail loading overlay */}
      {selectedType && detailLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
