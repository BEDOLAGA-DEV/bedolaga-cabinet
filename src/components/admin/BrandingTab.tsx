import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandingApi, setCachedBranding } from '../../api/branding';
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
  const startVideoInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // Queries
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
  });

  // Видео стартового меню бота: хранится как Telegram file_id
  const { data: startVideo } = useQuery({
    queryKey: ['bot-start-video'],
    queryFn: brandingApi.getBotStartVideo,
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

  const { data: footerEnabled } = useQuery({
    queryKey: ['footer-enabled'],
    queryFn: brandingApi.getFooterEnabled,
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

  const updateFooterMutation = useMutation({
    mutationFn: (enabled: boolean) => brandingApi.updateFooterEnabled(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footer-enabled'] });
    },
  });

  const uploadStartVideoMutation = useMutation({
    mutationFn: brandingApi.uploadBotStartVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-start-video'] });
    },
  });

  const deleteStartVideoMutation = useMutation({
    mutationFn: brandingApi.deleteBotStartVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-start-video'] });
    },
  });

  const handleStartVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadStartVideoMutation.mutate(file);
    }
    // Сбрасываем input, чтобы повторный выбор того же файла снова сработал
    e.target.value = '';
  };

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
                  loading="lazy"
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
                  className="rounded-xl bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600 disabled:opacity-50"
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
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-lg text-dark-100">
                  {branding?.name || t('admin.settings.notSpecified')}
                </span>
                <button
                  onClick={() => {
                    setNewName(branding?.name ?? '');
                    setEditingName(true);
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
                >
                  <PencilIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Видео стартового меню бота */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <h3 className="mb-1 text-lg font-semibold text-dark-100">
          {t('admin.settings.botStartVideo')}
        </h3>
        <p className="mb-4 text-sm text-dark-400">{t('admin.settings.botStartVideoDesc')}</p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={startVideoInputRef}
            type="file"
            accept="video/*"
            onChange={handleStartVideoUpload}
            className="hidden"
          />
          <button
            onClick={() => startVideoInputRef.current?.click()}
            disabled={uploadStartVideoMutation.isPending}
            className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-200 transition-colors hover:bg-dark-600 disabled:opacity-50"
          >
            {uploadStartVideoMutation.isPending
              ? t('common.loading')
              : startVideo?.has_video
                ? t('admin.settings.botStartVideoReplace')
                : t('admin.settings.botStartVideoUpload')}
          </button>

          {startVideo?.has_video && (
            <button
              onClick={() => deleteStartVideoMutation.mutate()}
              disabled={deleteStartVideoMutation.isPending}
              className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-400 transition-colors hover:bg-error-500/20 hover:text-error-400 disabled:opacity-50"
            >
              {t('admin.settings.botStartVideoRemove')}
            </button>
          )}

          <span className="text-sm text-dark-400">
            {startVideo?.has_video
              ? t('admin.settings.botStartVideoActive')
              : t('admin.settings.botStartVideoNone')}
          </span>
        </div>

        {uploadStartVideoMutation.isError && (
          <div className="mt-3 text-sm text-error-400">
            {t('admin.settings.botStartVideoError')}
          </div>
        )}
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

          <div className="flex items-center justify-between rounded-xl bg-dark-700/30 p-4">
            <div>
              <span className="font-medium text-dark-100">
                {t('admin.settings.legalFooter', 'Юридический футер')}
              </span>
              <p className="text-sm text-dark-400">
                {t(
                  'admin.settings.legalFooterDesc',
                  'Ссылки на оферту/политику/рекурренты внизу страницы входа',
                )}
              </p>
            </div>
            <Toggle
              checked={footerEnabled ?? true}
              onChange={() => updateFooterMutation.mutate(!(footerEnabled ?? true))}
              disabled={updateFooterMutation.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
