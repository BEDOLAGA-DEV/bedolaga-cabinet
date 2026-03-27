import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  brandingApi,
  setCachedBranding,
  type LoginFormConfig,
  type LoginFormSection,
} from '../../api/branding';
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

  // Login form config
  const DEFAULT_LOGIN_SECTIONS: LoginFormSection[] = [
    { type: 'telegram', enabled: true, order: 0 },
    { type: 'oauth', enabled: true, order: 1 },
    { type: 'email', enabled: true, order: 2 },
  ];

  const { data: loginFormConfig } = useQuery<LoginFormConfig>({
    queryKey: ['login-form-config'],
    queryFn: async () => {
      try {
        return await brandingApi.getLoginFormConfig();
      } catch {
        return { sections: DEFAULT_LOGIN_SECTIONS };
      }
    },
  });

  const [loginFormSections, setLoginFormSections] = useState<LoginFormSection[] | null>(null);
  const [loginFormDirty, setLoginFormDirty] = useState(false);

  // Initialize local state from fetched config
  const sections = loginFormSections ?? loginFormConfig?.sections ?? DEFAULT_LOGIN_SECTIONS;
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const updateLoginFormMutation = useMutation({
    mutationFn: (config: LoginFormConfig) => brandingApi.updateLoginFormConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-form-config'] });
      setLoginFormDirty(false);
      setLoginFormSections(null);
    },
  });

  const handleSectionToggle = (type: LoginFormSection['type']) => {
    setLoginFormSections((prev) => {
      const current = prev ?? loginFormConfig?.sections ?? DEFAULT_LOGIN_SECTIONS;
      return current.map((s) => (s.type === type ? { ...s, enabled: !s.enabled } : s));
    });
    setLoginFormDirty(true);
  };

  const handleSectionMove = (type: LoginFormSection['type'], direction: 'up' | 'down') => {
    setLoginFormSections((prev) => {
      const current = [...(prev ?? loginFormConfig?.sections ?? DEFAULT_LOGIN_SECTIONS)].sort(
        (a, b) => a.order - b.order,
      );
      const idx = current.findIndex((s) => s.type === type);
      if (idx < 0) return current;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= current.length) return current;

      // Swap orders
      const newSections = current.map((s) => ({ ...s }));
      const tmpOrder = newSections[idx].order;
      newSections[idx].order = newSections[swapIdx].order;
      newSections[swapIdx].order = tmpOrder;
      return newSections;
    });
    setLoginFormDirty(true);
  };

  const handleSaveLoginForm = () => {
    const current = loginFormSections ?? loginFormConfig?.sections ?? DEFAULT_LOGIN_SECTIONS;
    updateLoginFormMutation.mutate({ sections: current });
  };

  const SECTION_TYPE_LABELS: Record<
    LoginFormSection['type'],
    { icon: string; labelKey: string; defaultLabel: string }
  > = {
    telegram: {
      icon: 'TG',
      labelKey: 'admin.settings.loginForm.telegram',
      defaultLabel: 'Telegram',
    },
    oauth: { icon: 'OA', labelKey: 'admin.settings.loginForm.oauth', defaultLabel: 'OAuth' },
    email: { icon: '@', labelKey: 'admin.settings.loginForm.email', defaultLabel: 'Email' },
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

      {/* Login Form Constructor */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-dark-100">
          {t('admin.settings.loginForm.title', 'Login form')}
        </h3>
        <p className="mb-4 text-sm text-dark-400">
          {t(
            'admin.settings.loginForm.description',
            'Configure the order and visibility of login sections',
          )}
        </p>

        <div className="space-y-2">
          {sortedSections.map((section, idx) => {
            const meta = SECTION_TYPE_LABELS[section.type];
            return (
              <div
                key={section.type}
                className="flex items-center gap-3 rounded-xl bg-dark-700/30 p-3"
              >
                {/* Icon */}
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-dark-600 text-xs font-bold text-dark-200">
                  {meta.icon}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <span className="text-sm font-medium text-dark-100">
                    {t(meta.labelKey, meta.defaultLabel)}
                  </span>
                </div>

                {/* Up/Down buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleSectionMove(section.type, 'up')}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-dark-400 transition-colors hover:bg-dark-600 hover:text-dark-200 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Move up"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionMove(section.type, 'down')}
                    disabled={idx === sortedSections.length - 1}
                    className="rounded p-0.5 text-dark-400 transition-colors hover:bg-dark-600 hover:text-dark-200 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Move down"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Toggle */}
                <Toggle
                  checked={section.enabled}
                  onChange={() => handleSectionToggle(section.type)}
                  aria-label={t(meta.labelKey, meta.defaultLabel)}
                />
              </div>
            );
          })}
        </div>

        {/* Save button */}
        {loginFormDirty && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSaveLoginForm}
              disabled={updateLoginFormMutation.isPending}
              className="rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
            >
              {updateLoginFormMutation.isPending
                ? t('common.saving', 'Saving...')
                : t('common.save')}
            </button>
            <button
              onClick={() => {
                setLoginFormSections(null);
                setLoginFormDirty(false);
              }}
              className="rounded-xl bg-dark-700 px-5 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-600"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
