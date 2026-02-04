import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  promocodesApi,
  PromoCodeDetail,
  PromoCodeType,
  PromoCodeCreateRequest,
  PromoCodeUpdateRequest,
  PromoGroup,
} from '../api/promocodes';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// Icons
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

const RefreshIcon = () => (
  <svg
    className="h-4 w-4 animate-spin"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

export default function AdminPromocodeCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const isEdit = !!id;

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin/promocodes'));

  // Form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<PromoCodeType>('balance');
  const [balanceBonusRubles, setBalanceBonusRubles] = useState<number | ''>(0);
  const [subscriptionDays, setSubscriptionDays] = useState<number | ''>(0);
  const [maxUses, setMaxUses] = useState<number | ''>(1);
  const [isActive, setIsActive] = useState(true);
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [promoGroupId, setPromoGroupId] = useState<number | null>(null);

  // Fetch promo groups (for promo_group type)
  const { data: promoGroupsData } = useQuery({
    queryKey: ['admin-promo-groups'],
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
  });

  const promoGroups: PromoGroup[] = promoGroupsData?.items || [];

  // Fetch promocode for editing
  const { isLoading: isLoadingPromocode } = useQuery({
    queryKey: ['admin-promocode', id],
    queryFn: () => promocodesApi.getPromocode(Number(id)),
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: useCallback((data: PromoCodeDetail) => {
      setCode(data.code);
      setType(data.type);
      // For discount type, balance_bonus_kopeks is percentage directly
      // For balance type, balance_bonus_kopeks needs to be converted to rubles
      if (data.type === 'discount') {
        setBalanceBonusRubles(data.balance_bonus_kopeks);
      } else {
        setBalanceBonusRubles(data.balance_bonus_rubles || 0);
      }
      setSubscriptionDays(data.subscription_days || 0);
      setMaxUses(data.max_uses || 1);
      setIsActive(data.is_active ?? true);
      setFirstPurchaseOnly(data.first_purchase_only || false);
      setValidUntil(data.valid_until ? data.valid_until.split('T')[0] : '');
      setPromoGroupId(data.promo_group_id || null);
      return data;
    }, []),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: promocodesApi.createPromocode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      navigate('/admin/promocodes');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PromoCodeUpdateRequest }) =>
      promocodesApi.updatePromocode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promocodes'] });
      navigate('/admin/promocodes');
    },
  });

  const handleSubmit = () => {
    // For discount: balance_bonus_kopeks = percent (integer), subscription_days = hours
    // For balance: balance_bonus_kopeks = rubles * 100
    const balanceValue = balanceBonusRubles === '' ? 0 : balanceBonusRubles;
    const daysValue = subscriptionDays === '' ? 0 : subscriptionDays;
    const maxUsesValue = maxUses === '' ? 0 : maxUses;

    const data: PromoCodeCreateRequest | PromoCodeUpdateRequest = {
      code: code.trim().toUpperCase(),
      type,
      balance_bonus_kopeks:
        type === 'discount'
          ? Math.round(balanceValue) // percent as integer
          : Math.round(balanceValue * 100), // rubles to kopeks
      subscription_days: daysValue,
      max_uses: maxUsesValue,
      is_active: isActive,
      first_purchase_only: firstPurchaseOnly,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      promo_group_id: type === 'promo_group' ? promoGroupId : null,
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data });
    } else {
      createMutation.mutate(data as PromoCodeCreateRequest);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Validation
  const isCodeValid = code.trim().length > 0;
  const balanceValue = balanceBonusRubles === '' ? 0 : balanceBonusRubles;
  const daysValue = subscriptionDays === '' ? 0 : subscriptionDays;

  const isValid = (): boolean => {
    if (!isCodeValid) return false;
    if (type === 'balance' && balanceValue <= 0) return false;
    if ((type === 'subscription_days' || type === 'trial_subscription') && daysValue <= 0)
      return false;
    if (type === 'promo_group' && !promoGroupId) return false;
    if (type === 'discount' && (balanceValue <= 0 || balanceValue > 100 || daysValue <= 0))
      return false;
    return true;
  };

  // Collect validation errors for display
  const validationErrors: string[] = [];
  if (!isCodeValid) {
    validationErrors.push('codeRequired');
  }
  if (type === 'balance' && balanceValue <= 0) {
    validationErrors.push('balanceRequired');
  }
  if ((type === 'subscription_days' || type === 'trial_subscription') && daysValue <= 0) {
    validationErrors.push('daysRequired');
  }
  if (type === 'promo_group' && !promoGroupId) {
    validationErrors.push('groupRequired');
  }
  if (type === 'discount') {
    if (balanceValue <= 0 || balanceValue > 100) {
      validationErrors.push('discountPercentInvalid');
    }
    if (daysValue <= 0) {
      validationErrors.push('discountHoursRequired');
    }
  }

  // Loading state
  if (isEdit && isLoadingPromocode) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Show back button only on web, not in Telegram Mini App */}
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/admin/promocodes')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-dark-100">
            {isEdit
              ? t('admin.promocodes.modal.editPromocode')
              : t('admin.promocodes.modal.newPromocode')}
          </h1>
          <p className="text-sm text-dark-400">{t('admin.promocodes.subtitle')}</p>
        </div>
      </div>

      {/* Form */}
      <div className="card space-y-4">
        {/* Code */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.code')}
            <span className="text-error-400">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`input uppercase ${!isCodeValid && code.length > 0 ? 'border-error-500/50' : ''}`}
            placeholder="SUMMER2025"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.type')}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PromoCodeType)}
            className="input"
          >
            <option value="balance">{t('admin.promocodes.form.typeBalance')}</option>
            <option value="subscription_days">
              {t('admin.promocodes.form.typeSubscriptionDays')}
            </option>
            <option value="trial_subscription">
              {t('admin.promocodes.form.typeTrialSubscription')}
            </option>
            <option value="promo_group">{t('admin.promocodes.form.typePromoGroup')}</option>
            <option value="discount">{t('admin.promocodes.form.typeDiscount')}</option>
          </select>
        </div>

        {/* Type-specific fields */}
        {type === 'balance' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.promocodes.form.bonusAmount')}
              <span className="text-error-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={balanceBonusRubles}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setBalanceBonusRubles('');
                  } else {
                    setBalanceBonusRubles(Math.max(0, parseFloat(val) || 0));
                  }
                }}
                className="input w-32"
                min={0}
                step={1}
                placeholder="0"
              />
              <span className="text-dark-400">{t('admin.promocodes.form.rub')}</span>
            </div>
          </div>
        )}

        {(type === 'subscription_days' || type === 'trial_subscription') && (
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.promocodes.form.daysCount')}
              <span className="text-error-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={subscriptionDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setSubscriptionDays('');
                  } else {
                    setSubscriptionDays(Math.max(0, parseInt(val) || 0));
                  }
                }}
                className="input w-32"
                min={1}
                placeholder="0"
              />
              <span className="text-dark-400">{t('admin.promocodes.form.days')}</span>
            </div>
          </div>
        )}

        {type === 'promo_group' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.promocodes.form.discountGroup')}
              <span className="text-error-400">*</span>
            </label>
            <select
              value={promoGroupId || ''}
              onChange={(e) => setPromoGroupId(e.target.value ? parseInt(e.target.value) : null)}
              className="input"
            >
              <option value="">{t('admin.promocodes.form.selectGroup')}</option>
              {promoGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'discount' && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.promocodes.form.discountPercent')}
                <span className="text-error-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={balanceBonusRubles}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setBalanceBonusRubles('');
                    } else {
                      setBalanceBonusRubles(Math.min(100, Math.max(0, parseFloat(val) || 0)));
                    }
                  }}
                  className="input w-32"
                  min={1}
                  max={100}
                  placeholder="0"
                />
                <span className="text-dark-400">%</span>
              </div>
              <p className="mt-1 text-xs text-dark-500">
                {t('admin.promocodes.form.discountHint')}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.promocodes.form.validityPeriod')}
                <span className="text-error-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={subscriptionDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setSubscriptionDays('');
                    } else {
                      setSubscriptionDays(Math.max(0, parseInt(val) || 0));
                    }
                  }}
                  className="input w-32"
                  min={1}
                  placeholder="0"
                />
                <span className="text-dark-400">{t('admin.promocodes.form.hours')}</span>
              </div>
              <p className="mt-1 text-xs text-dark-500">
                {t('admin.promocodes.form.validityHint')}
              </p>
            </div>
          </>
        )}

        {/* Max Uses */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.maxUses')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={maxUses}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setMaxUses('');
                } else {
                  setMaxUses(Math.max(0, parseInt(val) || 0));
                }
              }}
              className="input w-32"
              min={0}
              placeholder="0"
            />
            <span className="text-xs text-dark-500">
              {t('admin.promocodes.form.unlimitedHint')}
            </span>
          </div>
        </div>

        {/* Valid Until */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.validUntil')}
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-xs text-dark-500">{t('admin.promocodes.form.validUntilHint')}</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative h-6 w-10 rounded-full transition-colors ${
                isActive ? 'bg-accent-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  isActive ? 'left-5' : 'left-1'
                }`}
              />
            </button>
            <span className="text-sm text-dark-200">{t('admin.promocodes.form.active')}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              onClick={() => setFirstPurchaseOnly(!firstPurchaseOnly)}
              className={`relative h-6 w-10 rounded-full transition-colors ${
                firstPurchaseOnly ? 'bg-accent-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  firstPurchaseOnly ? 'left-5' : 'left-1'
                }`}
              />
            </button>
            <span className="text-sm text-dark-200">
              {t('admin.promocodes.form.firstPurchaseOnly')}
            </span>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="card space-y-3">
        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-error-500/30 bg-error-500/10 p-3">
            <p className="mb-1 text-sm font-medium text-error-400">
              {t('admin.tariffs.cannotSave')}
            </p>
            <ul className="list-inside list-disc space-y-1 text-xs text-error-300">
              {validationErrors.map((error) => (
                <li key={error}>{t(`admin.promocodes.validation.${error}`)}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate('/admin/promocodes')}
            className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
          >
            {t('admin.promocodes.form.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid() || isLoading}
            className="btn-primary flex items-center gap-2"
          >
            {isLoading && <RefreshIcon />}
            {isLoading ? t('admin.promocodes.form.saving') : t('admin.promocodes.form.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
