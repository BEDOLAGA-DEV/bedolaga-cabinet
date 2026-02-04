import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminPaymentMethodsApi } from '../api/adminPaymentMethods';
import type { PromoGroupSimple } from '../types';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const METHOD_ICONS: Record<string, string> = {
  telegram_stars: '⭐',
  tribute: '🎁',
  cryptobot: '🪙',
  heleket: '⚡',
  yookassa: '🏦',
  mulenpay: '💳',
  pal24: '💸',
  platega: '💰',
  wata: '💧',
  freekassa: '💵',
  cloudpayments: '☁️',
  kassa_ai: '🏦',
};

const METHOD_LABELS: Record<string, string> = {
  telegram_stars: 'Telegram Stars',
  tribute: 'Tribute',
  cryptobot: 'CryptoBot',
  heleket: 'Heleket',
  yookassa: 'YooKassa',
  mulenpay: 'MulenPay',
  pal24: 'PayPalych',
  platega: 'Platega',
  wata: 'WATA',
  freekassa: 'Freekassa',
  cloudpayments: 'CloudPayments',
  kassa_ai: 'Kassa AI',
};

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const SaveIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

export default function AdminPaymentMethodEdit() {
  const { t } = useTranslation();
  const { methodId } = useParams<{ methodId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin/payment-methods'));

  // Fetch payment methods
  const { data: methods, isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: adminPaymentMethodsApi.getAll,
  });

  // Fetch promo groups
  const { data: promoGroups = [] } = useQuery<PromoGroupSimple[]>({
    queryKey: ['admin-payment-methods-promo-groups'],
    queryFn: adminPaymentMethodsApi.getPromoGroups,
  });

  const config = methods?.find((m) => m.method_id === methodId);

  // Local state for editing
  const [isEnabled, setIsEnabled] = useState(false);
  const [customName, setCustomName] = useState('');
  const [subOptions, setSubOptions] = useState<Record<string, boolean>>({});
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'telegram' | 'email'>('all');
  const [firstTopupFilter, setFirstTopupFilter] = useState<'any' | 'yes' | 'no'>('any');
  const [promoGroupFilterMode, setPromoGroupFilterMode] = useState<'all' | 'selected'>('all');
  const [selectedPromoGroupIds, setSelectedPromoGroupIds] = useState<number[]>([]);

  // Initialize state when config loads
  useEffect(() => {
    if (config) {
      setIsEnabled(config.is_enabled);
      setCustomName(config.display_name || '');
      setSubOptions(config.sub_options || {});
      setMinAmount(config.min_amount_kopeks?.toString() || '');
      setMaxAmount(config.max_amount_kopeks?.toString() || '');
      setUserTypeFilter(config.user_type_filter);
      setFirstTopupFilter(config.first_topup_filter);
      setPromoGroupFilterMode(config.promo_group_filter_mode);
      setSelectedPromoGroupIds(config.allowed_promo_group_ids);
    }
  }, [config]);

  // Update method mutation
  const updateMethodMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminPaymentMethodsApi.update(methodId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      navigate('/admin/payment-methods');
    },
  });

  const handleSave = () => {
    if (!config) return;

    const data: Record<string, unknown> = {
      is_enabled: isEnabled,
      user_type_filter: userTypeFilter,
      first_topup_filter: firstTopupFilter,
      promo_group_filter_mode: promoGroupFilterMode,
      allowed_promo_group_ids: promoGroupFilterMode === 'selected' ? selectedPromoGroupIds : [],
    };

    // Display name
    if (customName.trim()) {
      data.display_name = customName.trim();
    } else {
      data.reset_display_name = true;
    }

    // Sub-options
    if (config.available_sub_options) {
      data.sub_options = subOptions;
    }

    // Amounts
    if (minAmount.trim()) {
      data.min_amount_kopeks = parseInt(minAmount, 10) || null;
    } else {
      data.reset_min_amount = true;
    }
    if (maxAmount.trim()) {
      data.max_amount_kopeks = parseInt(maxAmount, 10) || null;
    } else {
      data.reset_max_amount = true;
    }

    updateMethodMutation.mutate(data);
  };

  const togglePromoGroup = (id: number) => {
    setSelectedPromoGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin/payment-methods')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <h1 className="text-2xl font-bold text-dark-50">
            {t('admin.paymentMethods.notFound', 'Payment method not found')}
          </h1>
        </div>
      </div>
    );
  }

  const displayName = config.display_name || config.default_display_name;
  const icon = METHOD_ICONS[config.method_id] || '💳';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Show back button only on web, not in Telegram Mini App */}
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/admin/payment-methods')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </button>
        )}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-700/50 text-xl">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark-50">{displayName}</h1>
          <p className="text-sm text-dark-500">
            {METHOD_LABELS[config.method_id] || config.method_id}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="card space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-dark-200">
              {t('admin.paymentMethods.methodEnabled')}
            </div>
            {!config.is_provider_configured && (
              <div className="mt-0.5 text-xs text-warning-400">
                {t('admin.paymentMethods.providerNotConfigured')}
              </div>
            )}
          </div>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              isEnabled ? 'bg-accent-500' : 'bg-dark-600'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                isEnabled ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Display name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-200">
            {t('admin.paymentMethods.displayName')}
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={config.default_display_name}
            className="input"
          />
          <p className="mt-1 text-xs text-dark-500">
            {t('admin.paymentMethods.displayNameHint')}: {config.default_display_name}
          </p>
        </div>

        {/* Sub-options */}
        {config.available_sub_options && config.available_sub_options.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-200">
              {t('admin.paymentMethods.subOptions')}
            </label>
            <div className="space-y-2">
              {config.available_sub_options.map((opt) => {
                const enabled = subOptions[opt.id] !== false;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSubOptions((prev) => ({ ...prev, [opt.id]: !enabled }))}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 transition-all ${
                      enabled
                        ? 'border-accent-500/30 bg-dark-700/30 text-dark-100'
                        : 'border-dark-800 bg-dark-900/30 text-dark-500'
                    }`}
                  >
                    <span className="text-sm">{opt.name}</span>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded ${
                        enabled ? 'bg-accent-500 text-white' : 'border border-dark-600 bg-dark-700'
                      }`}
                    >
                      {enabled && <CheckIcon />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Min/Max amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-200">
              {t('admin.paymentMethods.minAmount')}
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder={config.default_min_amount_kopeks.toString()}
              className="input"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-200">
              {t('admin.paymentMethods.maxAmount')}
            </label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder={config.default_max_amount_kopeks.toString()}
              className="input"
            />
          </div>
        </div>

        {/* Display conditions */}
        <div className="border-t border-dark-700 pt-3">
          <h3 className="mb-4 text-sm font-semibold text-dark-200">
            {t('admin.paymentMethods.conditions')}
          </h3>

          {/* User type filter */}
          <div className="mb-4">
            <label className="mb-2 block text-sm text-dark-300">
              {t('admin.paymentMethods.userTypeFilter')}
            </label>
            <div className="flex gap-2">
              {(['all', 'telegram', 'email'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setUserTypeFilter(val)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    userTypeFilter === val
                      ? 'border border-accent-500/40 bg-accent-500/20 text-accent-300'
                      : 'border border-dark-700 bg-dark-900/50 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  {val === 'all'
                    ? t('admin.paymentMethods.userTypeAll')
                    : val === 'telegram'
                      ? 'Telegram'
                      : 'Email'}
                </button>
              ))}
            </div>
          </div>

          {/* First topup filter */}
          <div className="mb-4">
            <label className="mb-2 block text-sm text-dark-300">
              {t('admin.paymentMethods.firstTopupFilter')}
            </label>
            <div className="flex gap-2">
              {(['any', 'yes', 'no'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setFirstTopupFilter(val)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    firstTopupFilter === val
                      ? 'border border-accent-500/40 bg-accent-500/20 text-accent-300'
                      : 'border border-dark-700 bg-dark-900/50 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  {val === 'any'
                    ? t('admin.paymentMethods.firstTopupAny')
                    : val === 'yes'
                      ? t('admin.paymentMethods.firstTopupWas')
                      : t('admin.paymentMethods.firstTopupWasNot')}
                </button>
              ))}
            </div>
          </div>

          {/* Promo groups filter */}
          <div>
            <label className="mb-2 block text-sm text-dark-300">
              {t('admin.paymentMethods.promoGroupFilter')}
            </label>
            <div className="mb-3 flex gap-2">
              {(['all', 'selected'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setPromoGroupFilterMode(val)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    promoGroupFilterMode === val
                      ? 'border border-accent-500/40 bg-accent-500/20 text-accent-300'
                      : 'border border-dark-700 bg-dark-900/50 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  {val === 'all'
                    ? t('admin.paymentMethods.promoGroupAll')
                    : t('admin.paymentMethods.promoGroupSelected')}
                </button>
              ))}
            </div>

            {promoGroupFilterMode === 'selected' && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-dark-700/50 bg-dark-900/30 p-3">
                {promoGroups.length === 0 ? (
                  <p className="py-2 text-center text-sm text-dark-500">
                    {t('admin.paymentMethods.noPromoGroups')}
                  </p>
                ) : (
                  promoGroups.map((group) => {
                    const selected = selectedPromoGroupIds.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => togglePromoGroup(group.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                          selected
                            ? 'bg-accent-500/15 text-accent-300'
                            : 'text-dark-400 hover:bg-dark-800/50'
                        }`}
                      >
                        <span>{group.name}</span>
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded ${
                            selected ? 'bg-accent-500 text-white' : 'border border-dark-600'
                          }`}
                        >
                          {selected && <CheckIcon />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/payment-methods')} className="btn-secondary flex-1">
          {t('admin.paymentMethods.cancelButton')}
        </button>
        <button
          onClick={handleSave}
          disabled={updateMethodMutation.isPending}
          className="btn-primary flex flex-1 items-center justify-center gap-2"
        >
          {updateMethodMutation.isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <SaveIcon />
          )}
          {t('admin.paymentMethods.saveButton')}
        </button>
      </div>
    </div>
  );
}
