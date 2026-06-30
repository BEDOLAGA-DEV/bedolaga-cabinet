import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminBroadcastsApi,
  BroadcastFilter,
  TariffFilter,
  CombinedBroadcastCreateRequest,
  CustomBroadcastButton,
} from '../api/adminBroadcasts';
import { AdminBackButton } from '../components/admin';
import { TelegramPreview, EmailPreview } from '../components/broadcasts/BroadcastPreview';
import {
  BroadcastIcon,
  ChevronDownIcon,
  DocumentIcon,
  EmailIcon,
  PhotoIcon,
  RefreshIcon,
  TelegramIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from '@/components/icons';

// Filter labels
const FILTER_GROUP_LABEL_KEYS: Record<string, string> = {
  basic: 'admin.broadcasts.filterGroups.basic',
  subscription: 'admin.broadcasts.filterGroups.subscription',
  traffic: 'admin.broadcasts.filterGroups.traffic',
  registration: 'admin.broadcasts.filterGroups.registration',
  activity: 'admin.broadcasts.filterGroups.activity',
  source: 'admin.broadcasts.filterGroups.source',
  tariff: 'admin.broadcasts.filterGroups.tariff',
  email: 'admin.broadcasts.filterGroups.email',
};

export default function AdminBroadcastCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Channel toggles (both can be enabled)
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  // Separate targets per channel
  const [telegramTarget, setTelegramTarget] = useState('');
  const [emailTarget, setEmailTarget] = useState('');
  const [showTelegramFilters, setShowTelegramFilters] = useState(false);
  const [showEmailFilters, setShowEmailFilters] = useState(false);

  // Broadcast category (system/news/promo)
  const [category, setCategory] = useState<'system' | 'news' | 'promo'>('system');

  // Telegram-specific state
  const [messageText, setMessageText] = useState('');
  const [selectedButtons, setSelectedButtons] = useState<string[]>(['home']);
  const [customButtons, setCustomButtons] = useState<CustomBroadcastButton[]>([]);
  const [isAddingCustomButton, setIsAddingCustomButton] = useState(false);
  const [newButtonLabel, setNewButtonLabel] = useState('');
  const [newButtonActionType, setNewButtonActionType] = useState<'callback' | 'url'>('callback');
  const [newButtonActionValue, setNewButtonActionValue] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'document'>('photo');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaPreviewRef = useRef<string | null>(null);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
    };
  }, []);

  // Email-specific state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');

  // Submitting state for dual send
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview modals
  const [showTelegramPreview, setShowTelegramPreview] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const previewMediaTypeForModal: 'photo' | 'video' | null =
    mediaType === 'photo' || mediaType === 'video' ? mediaType : null;

  const previewButtonRows = useMemo(() => {
    const rows: { text: string; url?: string; callback_data?: string }[][] = [];
    if (selectedButtons.length > 0) {
      const presetLabels: Record<string, string> = {
        balance: t('admin.broadcasts.btnBalance', 'Пополнить баланс'),
        // Бот отдаёт ключ кнопки как 'referrals' (см. BROADCAST_BUTTONS в admin.py),
        // раньше тут был 'partners' — из-за рассинхрона кнопка показывалась сырым
        // ключом 'referrals' вместо «Партнёрка» (Telegram-баг #602989).
        referrals: t('admin.broadcasts.btnPartners', 'Партнёрка'),
        promocode: t('admin.broadcasts.btnPromocode', 'Промокод'),
        connect: t('admin.broadcasts.btnConnect', 'Подключиться'),
        subscription: t('admin.broadcasts.btnSubscription', 'Подписка'),
        support: t('admin.broadcasts.btnSupport', 'Техподдержка'),
        home: t('admin.broadcasts.btnHome', 'На главную'),
      };
      for (const id of selectedButtons) {
        rows.push([{ text: presetLabels[id] || id, callback_data: id }]);
      }
    }
    for (const cb of customButtons) {
      rows.push([
        {
          text: cb.label,
          ...(cb.action_type === 'url'
            ? { url: cb.action_value }
            : { callback_data: cb.action_value }),
        },
      ]);
    }
    return rows;
  }, [selectedButtons, customButtons, t]);

  // Fetch Telegram filters
  const { data: filtersData, isLoading: filtersLoading } = useQuery({
    queryKey: ['admin', 'broadcasts', 'filters'],
    queryFn: adminBroadcastsApi.getFilters,
    enabled: telegramEnabled,
  });

  // Fetch Email filters
  const { data: emailFiltersData, isLoading: emailFiltersLoading } = useQuery({
    queryKey: ['admin', 'broadcasts', 'email-filters'],
    queryFn: adminBroadcastsApi.getEmailFilters,
    enabled: emailEnabled,
  });

  // Fetch buttons
  const { data: buttonsData } = useQuery({
    queryKey: ['admin', 'broadcasts', 'buttons'],
    queryFn: adminBroadcastsApi.getButtons,
    enabled: telegramEnabled,
  });

  // Preview mutations — separate for each channel
  const telegramPreviewMutation = useMutation({
    mutationFn: adminBroadcastsApi.preview,
  });

  const emailPreviewMutation = useMutation({
    mutationFn: adminBroadcastsApi.previewEmail,
  });

  // Create mutation (used for single-channel sends)
  const createMutation = useMutation({
    mutationFn: adminBroadcastsApi.createCombined,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      navigate(`/admin/broadcasts/${data.id}`);
    },
  });

  // Group Telegram filters
  const groupedTelegramFilters = useMemo(() => {
    if (!filtersData) return {};
    const groups: Record<string, (BroadcastFilter | TariffFilter)[]> = {};

    filtersData.filters.forEach((f) => {
      const group = f.group || 'basic';
      if (!groups[group]) groups[group] = [];
      groups[group].push(f);
    });

    if (filtersData.tariff_filters.length > 0) {
      groups['tariff'] = filtersData.tariff_filters;
    }

    filtersData.custom_filters.forEach((f) => {
      const group = f.group || 'custom';
      if (!groups[group]) groups[group] = [];
      groups[group].push(f);
    });

    return groups;
  }, [filtersData]);

  // Group Email filters
  const groupedEmailFilters = useMemo(() => {
    if (!emailFiltersData) return {};
    const groups: Record<string, BroadcastFilter[]> = {};

    emailFiltersData.filters.forEach((f) => {
      const group = f.group || 'email';
      if (!groups[group]) groups[group] = [];
      groups[group].push(f);
    });

    return groups;
  }, [emailFiltersData]);

  // Selected filter info for each channel
  const selectedTelegramFilter = useMemo(() => {
    if (!telegramTarget || !filtersData) return null;
    const all = [
      ...filtersData.filters,
      ...filtersData.tariff_filters,
      ...filtersData.custom_filters,
    ];
    return all.find((f) => f.key === telegramTarget) ?? null;
  }, [telegramTarget, filtersData]);

  const selectedEmailFilter = useMemo(() => {
    if (!emailTarget || !emailFiltersData) return null;
    return emailFiltersData.filters.find((f) => f.key === emailTarget) ?? null;
  }, [emailTarget, emailFiltersData]);

  // Handle toggling channels
  const handleToggleTelegram = () => {
    setTelegramEnabled((prev) => !prev);
    setTelegramTarget('');
    telegramPreviewMutation.reset();
  };

  const handleToggleEmail = () => {
    setEmailEnabled((prev) => !prev);
    setEmailTarget('');
    emailPreviewMutation.reset();
  };

  // Handle filter selection per channel
  const handleTelegramFilterSelect = (filterKey: string) => {
    setTelegramTarget(filterKey);
    setShowTelegramFilters(false);
    telegramPreviewMutation.mutate(filterKey);
  };

  const handleEmailFilterSelect = (filterKey: string) => {
    setEmailTarget(filterKey);
    setShowEmailFilters(false);
    emailPreviewMutation.mutate(filterKey);
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine type locally to avoid stale state in async call
    let detectedType: 'photo' | 'video' | 'document';
    if (file.type.startsWith('image/')) {
      detectedType = 'photo';
    } else if (file.type.startsWith('video/')) {
      detectedType = 'video';
    } else {
      detectedType = 'document';
    }

    setMediaFile(file);
    setMediaType(detectedType);

    if (detectedType === 'photo') {
      if (mediaPreviewRef.current) URL.revokeObjectURL(mediaPreviewRef.current);
      const url = URL.createObjectURL(file);
      mediaPreviewRef.current = url;
      setMediaPreview(url);
    } else {
      setMediaPreview(null);
    }

    setIsUploading(true);
    try {
      const result = await adminBroadcastsApi.uploadMedia(file, detectedType);
      setUploadedFileId(result.file_id);
    } catch {
      setMediaFile(null);
      setMediaPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove media
  const handleRemoveMedia = () => {
    if (mediaPreviewRef.current) {
      URL.revokeObjectURL(mediaPreviewRef.current);
      mediaPreviewRef.current = null;
    }
    setMediaFile(null);
    setMediaPreview(null);
    setUploadedFileId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle button
  const toggleButton = (key: string) => {
    setSelectedButtons((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key],
    );
  };

  // Custom button validation
  const isNewButtonValid = useMemo(() => {
    if (!newButtonLabel.trim() || !newButtonActionValue.trim()) return false;
    if (newButtonActionType === 'url') {
      return /^https:\/\/|^tg:\/\//.test(newButtonActionValue.trim());
    }
    if (newButtonActionType === 'callback') {
      return new TextEncoder().encode(newButtonActionValue.trim()).length <= 64;
    }
    return true;
  }, [newButtonLabel, newButtonActionType, newButtonActionValue]);

  // Custom button handlers
  const addCustomButton = () => {
    if (!isNewButtonValid) return;
    setCustomButtons((prev) => [
      ...prev,
      {
        label: newButtonLabel.trim(),
        action_type: newButtonActionType,
        action_value: newButtonActionValue.trim(),
      },
    ]);
    setNewButtonLabel('');
    setNewButtonActionValue('');
    setNewButtonActionType('callback');
    setIsAddingCustomButton(false);
  };

  const removeCustomButton = (index: number) => {
    setCustomButtons((prev) => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const isTelegramValid = telegramEnabled && telegramTarget && messageText.trim().length > 0;
  const isEmailValid =
    emailEnabled && emailTarget && emailSubject.trim().length > 0 && emailContent.trim().length > 0;

  const isValid = useMemo(() => {
    if (!telegramEnabled && !emailEnabled) return false;
    if (telegramEnabled && !isTelegramValid) return false;
    if (emailEnabled && !isEmailValid) return false;
    return true;
  }, [telegramEnabled, emailEnabled, isTelegramValid, isEmailValid]);

  const bothChannels = telegramEnabled && emailEnabled;

  // Submit
  const handleSubmit = async () => {
    if (!isValid) return;

    // Single channel — use existing createMutation with navigation to detail
    if (telegramEnabled && !emailEnabled) {
      const data: CombinedBroadcastCreateRequest = {
        channel: 'telegram',
        target: telegramTarget,
        message_text: messageText,
        selected_buttons: selectedButtons,
        custom_buttons: customButtons.length > 0 ? customButtons : undefined,
        category,
      };
      if (uploadedFileId) {
        data.media = { type: mediaType, file_id: uploadedFileId };
      }
      createMutation.mutate(data);
      return;
    }

    if (emailEnabled && !telegramEnabled) {
      const data: CombinedBroadcastCreateRequest = {
        channel: 'email',
        target: emailTarget,
        email_subject: emailSubject,
        email_html_content: emailContent,
        category,
      };
      createMutation.mutate(data);
      return;
    }

    // Both channels — two sequential requests, navigate to list
    setIsSubmitting(true);
    try {
      const telegramData: CombinedBroadcastCreateRequest = {
        channel: 'telegram',
        target: telegramTarget,
        message_text: messageText,
        selected_buttons: selectedButtons,
        custom_buttons: customButtons.length > 0 ? customButtons : undefined,
        category,
      };
      if (uploadedFileId) {
        telegramData.media = { type: mediaType, file_id: uploadedFileId };
      }

      const emailData: CombinedBroadcastCreateRequest = {
        channel: 'email',
        target: emailTarget,
        email_subject: emailSubject,
        email_html_content: emailContent,
        category,
      };

      await adminBroadcastsApi.createCombined(telegramData);
      await adminBroadcastsApi.createCombined(emailData);

      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      navigate('/admin/broadcasts');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recipients counts per channel
  const telegramRecipientsCount = telegramEnabled
    ? (telegramPreviewMutation.data?.count ?? selectedTelegramFilter?.count ?? null)
    : null;

  const emailRecipientsCount = emailEnabled
    ? (emailPreviewMutation.data?.count ?? selectedEmailFilter?.count ?? null)
    : null;

  const isPending = createMutation.isPending || isSubmitting;

  // Render filter dropdown
  const renderFilterDropdown = (
    channelType: 'telegram' | 'email',
    target: string,
    selectedFilter: BroadcastFilter | TariffFilter | null,
    recipientsCount: number | null,
    showFilters: boolean,
    setShowFilters: (v: boolean) => void,
    handleFilterSelect: (key: string) => void,
    groupedFilters: Record<string, (BroadcastFilter | TariffFilter)[]>,
    isLoading: boolean,
  ) => (
    <div>
      <label className="mb-2 block text-sm font-medium text-dark-300">
        {channelType === 'telegram'
          ? t('admin.broadcasts.selectFilter')
          : t('admin.broadcasts.selectEmailFilter')}
      </label>
      <div className="relative">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex w-full items-center justify-between rounded-lg border border-dark-700 bg-dark-800 p-3 text-left transition-colors hover:border-dark-600"
        >
          <div className="flex items-center gap-2">
            <UsersIcon />
            <span className={selectedFilter ? 'text-dark-100' : 'text-dark-400'}>
              {selectedFilter
                ? selectedFilter.label
                : channelType === 'telegram'
                  ? t('admin.broadcasts.selectFilterPlaceholder')
                  : t('admin.broadcasts.selectEmailFilterPlaceholder')}
            </span>
            {recipientsCount !== null && (
              <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
                {recipientsCount} {t('admin.broadcasts.recipients')}
              </span>
            )}
          </div>
          <ChevronDownIcon className="h-4 w-4" />
        </button>

        {showFilters && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-dark-700 bg-dark-800 shadow-xl">
            {isLoading ? (
              <div className="p-4 text-center text-dark-400">{t('common.loading')}</div>
            ) : (
              Object.entries(groupedFilters).map(([group, filters]) => (
                <div key={group}>
                  <div className="sticky top-0 bg-dark-900 px-3 py-2 text-xs font-medium text-dark-400">
                    {FILTER_GROUP_LABEL_KEYS[group] ? t(FILTER_GROUP_LABEL_KEYS[group]) : group}
                  </div>
                  {filters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => handleFilterSelect(filter.key)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-dark-700 ${
                        target === filter.key ? 'bg-accent-500/20' : ''
                      }`}
                    >
                      <span className="text-dark-100">{filter.label}</span>
                      {filter.count !== null && filter.count !== undefined && (
                        <span className="text-xs text-dark-400">{filter.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
            <BroadcastIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">{t('admin.broadcasts.create')}</h1>
            <p className="text-sm text-dark-400">{t('admin.broadcasts.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Channel toggles */}
      <div className="card">
        <label className="mb-3 block text-sm font-medium text-dark-300">
          {t('admin.broadcasts.selectChannel')}
        </label>
        <div className="flex gap-3">
          <button
            onClick={handleToggleTelegram}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-4 transition-all ${
              telegramEnabled
                ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600'
            }`}
          >
            <TelegramIcon />
            <span className="font-medium">{t('admin.broadcasts.enableTelegram')}</span>
          </button>
          <button
            onClick={handleToggleEmail}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-4 transition-all ${
              emailEnabled
                ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600'
            }`}
          >
            <EmailIcon />
            <span className="font-medium">{t('admin.broadcasts.enableEmail')}</span>
          </button>
        </div>
        {!telegramEnabled && !emailEnabled && (
          <p className="mt-2 text-sm text-error-400">{t('admin.broadcasts.atLeastOneChannel')}</p>
        )}
        {bothChannels && (
          <p className="mt-2 text-sm text-accent-400">{t('admin.broadcasts.sendingBoth')}</p>
        )}
      </div>

      {/* Broadcast category */}
      <div className="card">
        <label className="mb-3 block text-sm font-medium text-dark-300">
          {t('admin.broadcasts.category', 'Категория рассылки')}
        </label>
        <p className="mb-3 text-xs text-dark-500">
          {t(
            'admin.broadcasts.categoryDesc',
            'Пользователи могут отключить получение новостей и промо в настройках профиля. Системные рассылки доставляются всем.',
          )}
        </p>
        <div className="flex gap-3">
          {(['system', 'news', 'promo'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-all ${
                category === cat
                  ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                  : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600'
              }`}
            >
              {cat === 'system' && t('admin.broadcasts.categorySystem', '⚙️ Системное')}
              {cat === 'news' && t('admin.broadcasts.categoryNews', '📰 Новости')}
              {cat === 'promo' && t('admin.broadcasts.categoryPromo', '🎁 Промо')}
            </button>
          ))}
        </div>
      </div>

      {/* Telegram section */}
      {telegramEnabled && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-dark-100">
              {t('admin.broadcasts.telegramSection')}
            </h2>
            <button
              type="button"
              onClick={() => setShowTelegramPreview(true)}
              disabled={messageText.trim().length === 0}
              className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('admin.broadcasts.preview', 'Предпросмотр')}
            </button>
          </div>

          {/* Telegram filter selection */}
          {renderFilterDropdown(
            'telegram',
            telegramTarget,
            selectedTelegramFilter,
            telegramRecipientsCount,
            showTelegramFilters,
            setShowTelegramFilters,
            handleTelegramFilterSelect,
            groupedTelegramFilters,
            filtersLoading,
          )}

          {/* Message text */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.broadcasts.messageText')}
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('admin.broadcasts.messageTextPlaceholder')}
              rows={6}
              maxLength={4000}
              className="input min-h-[150px] resize-y"
            />
            <div className="mt-1 text-right text-xs text-dark-400">{messageText.length}/4000</div>
          </div>

          {/* Media upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.broadcasts.media')}
            </label>
            {mediaFile ? (
              <div className="rounded-lg border border-dark-700 bg-dark-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mediaType === 'photo' && <PhotoIcon />}
                    {mediaType === 'video' && <VideoIcon />}
                    {mediaType === 'document' && <DocumentIcon />}
                    <div>
                      <p className="text-sm text-dark-100">{mediaFile.name}</p>
                      <p className="text-xs text-dark-400">
                        {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveMedia}
                    className="rounded-lg p-2 text-dark-400 hover:bg-dark-700 hover:text-error-400"
                    disabled={isUploading}
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
                {mediaPreview && (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="mt-3 max-h-48 rounded-lg object-cover"
                  />
                )}
                {isUploading && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-accent-400">
                    <RefreshIcon />
                    {t('admin.broadcasts.uploading')}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,application/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-dark-600 bg-dark-800/50 p-6 text-dark-400 transition-colors hover:border-dark-500 hover:bg-dark-800 hover:text-dark-300"
                >
                  <PhotoIcon />
                  <span>{t('admin.broadcasts.addMedia')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Buttons selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.broadcasts.buttons')}
            </label>
            <div className="flex flex-wrap gap-2">
              {buttonsData?.buttons.map((button) => (
                <button
                  key={button.key}
                  onClick={() => toggleButton(button.key)}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedButtons.includes(button.key)
                      ? 'bg-accent-500 text-on-accent'
                      : 'border border-dark-700 bg-dark-800 text-dark-300 hover:bg-dark-700'
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom buttons */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.broadcasts.customButtons')}
            </label>

            {/* Existing custom buttons */}
            {customButtons.length > 0 && (
              <div className="mb-3 space-y-2">
                {customButtons.map((btn, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-dark-700 bg-dark-800 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="shrink-0 rounded bg-dark-700 px-1.5 py-0.5 text-xs text-dark-400">
                        {btn.action_type === 'url'
                          ? t('admin.broadcasts.customButtonTypeUrl')
                          : t('admin.broadcasts.customButtonTypeCallback')}
                      </span>
                      <span className="truncate text-sm text-dark-100">{btn.label}</span>
                      <span className="truncate text-xs text-dark-500">{btn.action_value}</span>
                    </div>
                    <button
                      onClick={() => removeCustomButton(index)}
                      className="ml-2 shrink-0 rounded p-1 text-dark-400 hover:bg-dark-700 hover:text-error-400"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline add form */}
            {isAddingCustomButton ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustomButton();
                }}
                className="space-y-3 rounded-lg border border-dark-600 bg-dark-800/50 p-3"
              >
                <input
                  type="text"
                  value={newButtonLabel}
                  onChange={(e) => setNewButtonLabel(e.target.value)}
                  placeholder={t('admin.broadcasts.customButtonLabelPlaceholder')}
                  maxLength={64}
                  className="input"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewButtonActionType('callback')}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                      newButtonActionType === 'callback'
                        ? 'bg-accent-500 text-on-accent'
                        : 'border border-dark-700 bg-dark-800 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    {t('admin.broadcasts.customButtonTypeCallback')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewButtonActionType('url')}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                      newButtonActionType === 'url'
                        ? 'bg-accent-500 text-on-accent'
                        : 'border border-dark-700 bg-dark-800 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    {t('admin.broadcasts.customButtonTypeUrl')}
                  </button>
                </div>
                <input
                  type="text"
                  value={newButtonActionValue}
                  onChange={(e) => setNewButtonActionValue(e.target.value)}
                  placeholder={
                    newButtonActionType === 'url'
                      ? t('admin.broadcasts.customButtonUrlPlaceholder')
                      : t('admin.broadcasts.customButtonCallbackPlaceholder')
                  }
                  maxLength={newButtonActionType === 'callback' ? 64 : 256}
                  className="input"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustomButton(false);
                      setNewButtonLabel('');
                      setNewButtonActionValue('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={!isNewButtonValid} className="btn-primary flex-1">
                    {t('common.add')}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingCustomButton(true)}
                disabled={customButtons.length >= 10}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-dark-600 bg-dark-800/50 px-4 py-3 text-sm text-dark-400 transition-colors hover:border-dark-500 hover:bg-dark-800 hover:text-dark-300"
              >
                <span>+</span>
                <span>{t('admin.broadcasts.addCustomButton')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Email section */}
      {emailEnabled && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-dark-100">
              {t('admin.broadcasts.emailSection')}
            </h2>
            <button
              type="button"
              onClick={() => setShowEmailPreview(true)}
              disabled={emailContent.trim().length === 0}
              className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('admin.broadcasts.preview', 'Предпросмотр')}
            </button>
          </div>

          {/* Email filter selection */}
          {renderFilterDropdown(
            'email',
            emailTarget,
            selectedEmailFilter,
            emailRecipientsCount,
            showEmailFilters,
            setShowEmailFilters,
            handleEmailFilterSelect,
            groupedEmailFilters,
            emailFiltersLoading,
          )}

          {/* Email subject */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.broadcasts.emailSubject')}
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder={t('admin.broadcasts.emailSubjectPlaceholder')}
              className="input"
              maxLength={200}
            />
          </div>

          {/* Email content */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.broadcasts.emailContent')}
            </label>
            <p className="mb-2 text-xs text-dark-400">{t('admin.broadcasts.emailContentHint')}</p>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder={t('admin.broadcasts.emailContentPlaceholder')}
              rows={10}
              className="input min-h-[200px] resize-y font-mono text-sm"
            />
          </div>

          {/* Email variables hint */}
          <div className="rounded-lg border border-dark-700 bg-dark-800/50 p-4">
            <p className="mb-2 text-sm font-medium text-dark-300">
              {t('admin.broadcasts.emailVariables')}
            </p>
            <div className="flex flex-wrap gap-2">
              {['{{user_name}}', '{{email}}', '{{user_id}}'].map((variable) => (
                <code
                  key={variable}
                  className="rounded bg-dark-700 px-2 py-1 text-xs text-accent-400"
                >
                  {variable}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="card flex items-center justify-between">
        <div className="text-sm text-dark-400">
          {(telegramRecipientsCount !== null || emailRecipientsCount !== null) && (
            <span>
              {t('admin.broadcasts.willBeSent')}:{' '}
              {telegramRecipientsCount !== null && (
                <>
                  <strong className="text-accent-400">{telegramRecipientsCount}</strong> (TG)
                </>
              )}
              {telegramRecipientsCount !== null && emailRecipientsCount !== null && ' + '}
              {emailRecipientsCount !== null && (
                <>
                  <strong className="text-accent-400">{emailRecipientsCount}</strong> (Email)
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/admin/broadcasts')} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isPending || isUploading}
            className="btn-primary flex items-center gap-2"
          >
            {isPending ? <RefreshIcon /> : <BroadcastIcon className="h-6 w-6" />}
            {t('admin.broadcasts.send')}
          </button>
        </div>
      </div>

      <TelegramPreview
        open={showTelegramPreview}
        onClose={() => setShowTelegramPreview(false)}
        text={messageText}
        mediaUrl={mediaPreview}
        mediaType={previewMediaTypeForModal}
        buttons={previewButtonRows}
      />
      <EmailPreview
        open={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        subject={emailSubject}
        htmlContent={emailContent}
      />
    </div>
  );
}
