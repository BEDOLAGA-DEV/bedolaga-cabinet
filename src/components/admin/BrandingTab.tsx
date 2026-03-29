import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandingApi, setCachedBranding } from '../../api/branding';
import type { LegalLinksConfig } from '../../api/branding';
import { setCachedFullscreenEnabled } from '../../hooks/useTelegramSDK';
import { UploadIcon, TrashIcon, PencilIcon, CheckIcon, CloseIcon } from './icons';
import { Toggle } from './Toggle';
import { BackgroundEditor } from './BackgroundEditor';

interface BrandingTabProps {
  accentColor?: string;
}

export function BrandingTab({ accentColor = '#3b82f6' }: BrandingTabProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // Queries
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
  });

  const { data: fullscreenSettings } = useQuery({
    queryKey: ['fullscreen-enabled'],
    queryFn: brandingApi.getFullscreenEnabled,
  });

  const { data: emailAuthSettings } = useQuery({
    queryKey: ['email-auth-enabled'],
    queryFn: brandingApi.getEmailAuthEnabled,
  });

  const { data: giftSettings } = useQuery({
    queryKey: ['gift-enabled'],
    queryFn: brandingApi.getGiftEnabled,
  });

  // Mutations
  const updateBrandingMutation = useMutation({
    mutationFn: brandingApi.updateName,
    onSuccess: (data) => {
      setCachedBranding(data);
      queryClient.invalidateQueries({ queryKey: ['branding'] });
      setEditingName(false);
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: brandingApi.uploadLogo,
    onSuccess: (data) => {
      setCachedBranding(data);
      queryClient.invalidateQueries({ queryKey: ['branding'] });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: brandingApi.deleteLogo,
    onSuccess: (data) => {
      setCachedBranding(data);
      queryClient.invalidateQueries({ queryKey: ['branding'] });
    },
  });

  const updateFullscreenMutation = useMutation({
    mutationFn: (enabled: boolean) => brandingApi.updateFullscreenEnabled(enabled),
    onSuccess: (data) => {
      setCachedFullscreenEnabled(data.enabled);
      queryClient.invalidateQueries({ queryKey: ['fullscreen-enabled'] });
    },
  });

  const updateEmailAuthMutation = useMutation({
    mutationFn: (enabled: boolean) => brandingApi.updateEmailAuthEnabled(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-auth-enabled'] });
    },
  });

  const updateGiftMutation = useMutation({
    mutationFn: (enabled: boolean) => brandingApi.updateGiftEnabled(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-enabled'] });
    },
  });

  // Legal links
  const { data: legalLinks } = useQuery({
    queryKey: ['legal-links'],
    queryFn: brandingApi.getLegalLinks,
  });

  const updateLegalLinksMutation = useMutation({
    mutationFn: (data: LegalLinksConfig) => brandingApi.updateLegalLinks(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-links'] });
      queryClient.invalidateQueries({ queryKey: ['branding'] });
    },
  });

  const [editingDoc, setEditingDoc] = useState<{ slug: string; title: string } | null>(null);
  const [docContents, setDocContents] = useState<Record<string, string>>({});
  const [docLang, setDocLang] = useState('ru');
  const [docLoading, setDocLoading] = useState(false);

  const LANGS = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'zh', label: 'ZH' },
    { code: 'fa', label: 'FA' },
  ];

  const updateDocMutation = useMutation({
    mutationFn: ({ slug, content }: { slug: string; content: string }) =>
      brandingApi.updateLegalDoc(slug, content),
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadLogoMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo & Name */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-dark-100">
          {t('admin.settings.logoAndName')}
        </h3>

        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl text-3xl font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              }}
            >
              {branding?.has_custom_logo ? (
                <img
                  src={brandingApi.getLogoUrl(branding) ?? undefined}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                branding?.logo_letter || 'V'
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLogoMutation.isPending}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-dark-700 px-3 py-2 text-sm text-dark-200 transition-colors hover:bg-dark-600 disabled:opacity-50"
              >
                <UploadIcon />
              </button>
              {branding?.has_custom_logo && (
                <button
                  onClick={() => deleteLogoMutation.mutate()}
                  disabled={deleteLogoMutation.isPending}
                  className="rounded-xl bg-dark-700 px-3 py-2 text-dark-400 transition-colors hover:bg-error-500/20 hover:text-error-400 disabled:opacity-50"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.settings.projectName')}
            </label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 rounded-xl border border-dark-600 bg-dark-700 px-4 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                  maxLength={50}
                />
                <button
                  onClick={() => updateBrandingMutation.mutate(newName)}
                  disabled={updateBrandingMutation.isPending}
                  className="rounded-xl bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                >
                  <CheckIcon />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-xl bg-dark-700 px-4 py-2 text-dark-300 transition-colors hover:bg-dark-600"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg text-dark-100">
                  {branding?.name || t('admin.settings.notSpecified')}
                </span>
                <button
                  onClick={() => {
                    setNewName(branding?.name ?? '');
                    setEditingName(true);
                  }}
                  className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
                >
                  <PencilIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated Background Editor */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <BackgroundEditor />
      </div>

      {/* Fullscreen & Email toggles */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-dark-100">
          {t('admin.settings.interfaceOptions')}
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-dark-700/30 p-4">
            <div>
              <span className="font-medium text-dark-100">
                {t('admin.settings.autoFullscreen')}
              </span>
              <p className="text-sm text-dark-400">{t('admin.settings.autoFullscreenDesc')}</p>
            </div>
            <Toggle
              checked={fullscreenSettings?.enabled ?? false}
              onChange={() =>
                updateFullscreenMutation.mutate(!(fullscreenSettings?.enabled ?? false))
              }
              disabled={updateFullscreenMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-dark-700/30 p-4">
            <div>
              <span className="font-medium text-dark-100">{t('admin.settings.emailAuth')}</span>
              <p className="text-sm text-dark-400">{t('admin.settings.emailAuthDesc')}</p>
            </div>
            <Toggle
              checked={emailAuthSettings?.enabled ?? true}
              onChange={() => updateEmailAuthMutation.mutate(!(emailAuthSettings?.enabled ?? true))}
              disabled={updateEmailAuthMutation.isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-dark-700/30 p-4">
            <div>
              <span className="font-medium text-dark-100">{t('admin.settings.giftEnabled')}</span>
              <p className="text-sm text-dark-400">{t('admin.settings.giftEnabledDesc')}</p>
            </div>
            <Toggle
              checked={giftSettings?.enabled ?? false}
              onChange={() => updateGiftMutation.mutate(!(giftSettings?.enabled ?? false))}
              disabled={updateGiftMutation.isPending}
            />
          </div>
        </div>
      </div>

      {/* Legal document editor modal */}
      {editingDoc && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setEditingDoc(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-dark-700 bg-dark-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-dark-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {t('admin.settings.editDocument', 'Редактирование')}: {editingDoc.title}
              </h2>
              <button
                onClick={() => setEditingDoc(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-dark-800 text-dark-400 transition-colors hover:bg-dark-700 hover:text-white"
              >
                &times;
              </button>
            </div>
            {/* Language tabs */}
            <div className="flex gap-1 border-b border-dark-700 px-6">
              {LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setDocLang(lang.code)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    docLang === lang.code
                      ? 'border-b-2 border-accent-500 text-accent-400'
                      : 'text-dark-400 hover:text-dark-200'
                  }`}
                >
                  {lang.label}
                  {docContents[lang.code] ? '' : ' *'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="mb-3 text-xs text-dark-500">
                {t('admin.settings.htmlHint', 'HTML-разметка. Используйте <h2>, <p>, <ul>, <li> для форматирования.')}
                {' '}{docLang !== 'ru' && !docContents[docLang] && t('admin.settings.htmlEmpty', '(пусто — будет использован RU)')}
              </p>
              <textarea
                value={docContents[docLang] || ''}
                onChange={(e) => setDocContents({ ...docContents, [docLang]: e.target.value })}
                className="h-[60vh] w-full rounded-xl border border-dark-600 bg-dark-800 p-4 font-mono text-sm text-dark-200 focus:border-accent-500 focus:outline-none"
                spellCheck={false}
                dir={docLang === 'fa' ? 'rtl' : 'ltr'}
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-dark-700 px-6 py-4">
              <button
                onClick={() => setEditingDoc(null)}
                className="rounded-xl bg-dark-700 px-5 py-2.5 text-sm text-dark-300 transition-colors hover:bg-dark-600"
              >
                {t('common.cancel', 'Отмена')}
              </button>
              <button
                onClick={async () => {
                  // Save all languages that have content
                  for (const lang of LANGS) {
                    const content = docContents[lang.code];
                    if (content !== undefined) {
                      await updateDocMutation.mutateAsync({
                        slug: `${editingDoc.slug}_${lang.code}`,
                        content: content || '',
                      });
                    }
                  }
                  // Also save base slug = ru content (for backward compat)
                  if (docContents.ru) {
                    await updateDocMutation.mutateAsync({
                      slug: editingDoc.slug,
                      content: docContents.ru,
                    });
                  }
                  setEditingDoc(null);
                }}
                disabled={updateDocMutation.isPending}
                className="rounded-xl bg-accent-500 px-5 py-2.5 text-sm text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
              >
                {updateDocMutation.isPending
                  ? t('common.saving', 'Сохранение...')
                  : t('common.save', 'Сохранить')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Links */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-dark-100">
          {t('admin.settings.legalLinks', 'Юридические документы')}
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-dark-700/30 p-4">
            <div>
              <span className="font-medium text-dark-100">
                {t('admin.settings.legalLinksEnabled', 'Показывать на странице входа')}
              </span>
              <p className="text-sm text-dark-400">
                {t('admin.settings.legalLinksDesc', 'Ссылки на правила, оферту и политику конфиденциальности')}
              </p>
            </div>
            <Toggle
              checked={legalLinks?.enabled ?? false}
              onChange={() => {
                const current = legalLinks || { enabled: false, links: [] };
                updateLegalLinksMutation.mutate({ ...current, enabled: !current.enabled });
              }}
              disabled={updateLegalLinksMutation.isPending}
            />
          </div>

          {legalLinks?.enabled && (
            <div className="space-y-3">
              {(legalLinks?.links || []).map((link) => (
                <div key={link.slug} className="flex items-center gap-3 rounded-xl bg-dark-700/30 px-4 py-3">
                  <span className="flex-1 text-sm text-dark-200">{t(`legal.${link.slug}`, link.title)}</span>
                  <button
                    onClick={async () => {
                      setDocLoading(true);
                      try {
                        // Load all language versions
                        const results: Record<string, string> = {};
                        await Promise.all(
                          LANGS.map(async (lang) => {
                            try {
                              const doc = await brandingApi.getLegalDoc(`${link.slug}_${lang.code}`);
                              results[lang.code] = doc.content;
                            } catch {
                              results[lang.code] = '';
                            }
                          }),
                        );
                        // Fallback: if no lang-specific, try base slug for ru
                        if (!results.ru) {
                          try {
                            const base = await brandingApi.getLegalDoc(link.slug);
                            if (base.content) results.ru = base.content;
                          } catch { /* empty */ }
                        }
                        setDocContents(results);
                        setDocLang('ru');
                        setEditingDoc({ slug: link.slug, title: t(`legal.${link.slug}`, link.title) });
                      } catch {
                        setDocContents({});
                        setEditingDoc({ slug: link.slug, title: t(`legal.${link.slug}`, link.title) });
                      } finally {
                        setDocLoading(false);
                      }
                    }}
                    disabled={docLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-dark-600 px-3 py-1.5 text-xs text-dark-300 transition-colors hover:bg-dark-500 hover:text-dark-100 disabled:opacity-50"
                  >
                    <PencilIcon /> {t('admin.settings.editContent', 'Редактировать')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
