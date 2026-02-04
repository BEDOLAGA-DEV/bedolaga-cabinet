import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  promoOffersApi,
  PromoOfferBroadcastRequest,
  TARGET_SEGMENTS,
  TargetSegment,
  OFFER_TYPE_CONFIG,
  OfferType,
} from '../api/promoOffers';
import { adminUsersApi, UserListItem } from '../api/adminUsers';
import { AdminBackButton } from '../components/admin';
import { useBackButton } from '../platform/hooks/useBackButton';

// Icons
const SendIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const getOfferTypeIcon = (offerType: string): string => {
  return OFFER_TYPE_CONFIG[offerType as OfferType]?.icon || '🎁';
};

export default function AdminPromoOfferSend() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useBackButton(() => navigate('/admin/promo-offers'));

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [sendMode, setSendMode] = useState<'segment' | 'user'>('segment');
  const [selectedTarget, setSelectedTarget] = useState<TargetSegment>('active');
  const [userId, setUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{
    title: string;
    message: string;
    isSuccess: boolean;
  } | null>(null);

  // Query templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['admin-promo-templates'],
    queryFn: promoOffersApi.getTemplates,
  });

  const templates = templatesData?.items || [];
  const activeTemplates = templates.filter((t) => t.is_active);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Set default template when loaded
  if (!selectedTemplateId && activeTemplates.length > 0) {
    setSelectedTemplateId(activeTemplates[0].id);
  }

  // User search query with debounce
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['admin-users-search', searchQuery],
    queryFn: () => adminUsersApi.getUsers({ search: searchQuery, limit: 10 }),
    enabled: searchQuery.length >= 2 && sendMode === 'user',
    staleTime: 30000,
  });

  // Filter users with telegram_id only
  const filteredUsers = (searchResults?.users || []).filter((u) => u.telegram_id);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle user selection
  const handleSelectUser = (user: UserListItem) => {
    setSelectedUser(user);
    setUserId(user.telegram_id.toString());
    setSearchQuery('');
    setShowDropdown(false);
  };

  // Clear selected user
  const handleClearUser = () => {
    setSelectedUser(null);
    setUserId('');
    setSearchQuery('');
  };

  // Broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: promoOffersApi.broadcastOffer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-logs'] });

      let message = t('admin.promoOffers.result.offersCreated', { count: data.created_offers });
      if (data.notifications_sent > 0 || data.notifications_failed > 0) {
        message +=
          '\n' +
          t('admin.promoOffers.result.notificationsSent', { count: data.notifications_sent });
        if (data.notifications_failed > 0) {
          message +=
            ' ' +
            t('admin.promoOffers.result.notificationsFailed', {
              count: data.notifications_failed,
            });
        }
      }

      setResult({
        title: t('admin.promoOffers.result.sentTitle'),
        message,
        isSuccess: true,
      });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      setResult({
        title: t('common.error'),
        message: axiosErr.response?.data?.detail || t('admin.promoOffers.result.sendError'),
        isSuccess: false,
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedTemplateId || !selectedTemplate) return;

    const data: PromoOfferBroadcastRequest = {
      notification_type: selectedTemplate.offer_type,
      valid_hours: selectedTemplate.valid_hours,
      discount_percent: selectedTemplate.discount_percent,
      effect_type:
        selectedTemplate.offer_type === 'test_access' ? 'test_access' : 'percent_discount',
      extra_data: {
        template_id: selectedTemplate.id,
        active_discount_hours: selectedTemplate.active_discount_hours,
        test_duration_hours: selectedTemplate.test_duration_hours,
        test_squad_uuids: selectedTemplate.test_squad_uuids,
      },
      send_notification: true,
      message_text: selectedTemplate.message_text,
      button_text: selectedTemplate.button_text,
    };

    if (sendMode === 'user') {
      const id = parseInt(userId);
      if (!id) return;
      data.telegram_id = id;
    } else {
      data.target = selectedTarget;
    }

    broadcastMutation.mutate(data);
  };

  const isValid = () => {
    if (!selectedTemplateId) return false;
    if (sendMode === 'user' && !userId.trim()) return false;
    return true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-md py-12 text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              result.isSuccess ? 'bg-success-500/20' : 'bg-error-500/20'
            }`}
          >
            {result.isSuccess ? (
              <svg
                className="h-8 w-8 text-success-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg
                className="h-8 w-8 text-error-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h3 className="mb-2 text-lg font-semibold text-dark-100">{result.title}</h3>
          <p className="mb-6 whitespace-pre-wrap text-dark-400">{result.message}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/admin/promo-offers')}
              className="rounded-lg bg-accent-500 px-6 py-2 text-white transition-colors hover:bg-accent-600"
            >
              {t('admin.promoOffers.backToList')}
            </button>
            {result.isSuccess && (
              <button
                onClick={() => setResult(null)}
                className="rounded-lg border border-dark-600 px-6 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('admin.promoOffers.sendAnother')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/promo-offers" />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-500/20 p-2">
            <SendIcon />
          </div>
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.promoOffers.send.title')}
          </h1>
        </div>
      </div>

      {activeTemplates.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.promoOffers.noActiveTemplates')}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Template Selection */}
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-6">
            <label className="mb-3 block text-sm font-medium text-dark-200">
              {t('admin.promoOffers.send.offerTemplate')}
            </label>
            <div className="space-y-2">
              {activeTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedTemplateId === template.id
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getOfferTypeIcon(template.offer_type)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-dark-100">{template.name}</div>
                      <div className="text-sm text-dark-400">
                        {template.discount_percent > 0 &&
                          t('admin.promoOffers.send.discountLabel', {
                            percent: template.discount_percent,
                          })}
                        {template.offer_type === 'test_access' &&
                          t('admin.promoOffers.offerType.testAccess')}
                        <span className="mx-1">•</span>
                        {t('admin.promoOffers.send.hoursToActivate', {
                          hours: template.valid_hours,
                        })}
                      </div>
                    </div>
                    {selectedTemplateId === template.id && (
                      <div className="text-accent-400">
                        <CheckIcon />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Send Mode */}
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-6">
            <label className="mb-3 block text-sm font-medium text-dark-200">
              {t('admin.promoOffers.send.sendTo')}
            </label>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setSendMode('segment')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  sendMode === 'segment'
                    ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                    : 'border-dark-600 text-dark-400 hover:text-dark-200'
                }`}
              >
                <UsersIcon />
                <span>{t('admin.promoOffers.send.segment')}</span>
              </button>
              <button
                onClick={() => setSendMode('user')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  sendMode === 'user'
                    ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                    : 'border-dark-600 text-dark-400 hover:text-dark-200'
                }`}
              >
                <UserIcon />
                <span>{t('admin.promoOffers.send.user')}</span>
              </button>
            </div>

            {sendMode === 'segment' ? (
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value as TargetSegment)}
                className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2.5 text-dark-100 focus:border-accent-500 focus:outline-none"
              >
                {Object.entries(TARGET_SEGMENTS).map(([key, labelKey]) => (
                  <option key={key} value={key}>
                    {t(labelKey)}
                  </option>
                ))}
              </select>
            ) : (
              <div ref={searchRef} className="relative">
                {selectedUser ? (
                  // Selected user display
                  <div className="flex items-center justify-between rounded-lg border border-accent-500 bg-accent-500/10 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-600">
                        <UserIcon />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-dark-100">
                          {selectedUser.full_name ||
                            selectedUser.username ||
                            `ID: ${selectedUser.telegram_id}`}
                        </div>
                        <div className="text-xs text-dark-400">
                          {selectedUser.username && `@${selectedUser.username} · `}
                          Telegram: {selectedUser.telegram_id}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleClearUser}
                      className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ) : (
                  // Search input
                  <>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
                        <SearchIcon />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder={t('admin.promoOffers.send.searchUserPlaceholder')}
                        className="w-full rounded-lg border border-dark-600 bg-dark-700 py-2.5 pl-10 pr-3 text-dark-100 focus:border-accent-500 focus:outline-none"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                        </div>
                      )}
                    </div>

                    {/* Dropdown results */}
                    {showDropdown && searchQuery.length >= 2 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-dark-600 bg-dark-800 shadow-xl">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleSelectUser(user)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-dark-700"
                            >
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-dark-600">
                                <UserIcon />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-dark-100">
                                  {user.full_name || user.username || `User #${user.id}`}
                                </div>
                                <div className="truncate text-xs text-dark-400">
                                  {user.username && `@${user.username} · `}
                                  Telegram: {user.telegram_id}
                                </div>
                              </div>
                              {user.has_subscription && (
                                <span className="flex-shrink-0 rounded bg-success-500/20 px-1.5 py-0.5 text-xs text-success-400">
                                  {t('admin.promoOffers.send.hasSubscription')}
                                </span>
                              )}
                            </button>
                          ))
                        ) : !isSearching ? (
                          <div className="px-3 py-4 text-center text-sm text-dark-400">
                            {t('admin.promoOffers.send.noUsersFound')}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="rounded-xl border border-dark-700 bg-dark-800 p-6">
              <h4 className="mb-3 text-sm font-medium text-dark-200">
                {t('admin.promoOffers.send.preview')}
              </h4>
              <div className="rounded-lg bg-dark-700/50 p-4">
                <div className="whitespace-pre-wrap text-sm text-dark-200">
                  {selectedTemplate.message_text}
                </div>
                <div className="mt-4">
                  <span className="inline-block rounded-lg bg-accent-500 px-4 py-2 text-sm text-white">
                    {selectedTemplate.button_text}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate('/admin/promo-offers')}
              className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid() || broadcastMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-2 text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendIcon />
              {broadcastMutation.isPending
                ? t('admin.promoOffers.send.sending')
                : t('admin.promoOffers.send.sendButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
