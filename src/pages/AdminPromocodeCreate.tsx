import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DateField } from '../components/DateField';
import { createNumberInputHandler } from '../utils/inputHelpers';
import {
  promocodesApi,
  type PromoCodeDetail,
  type PromoCodeType,
  type PromoCodeCreateRequest,
  type PromoCodeUpdateRequest,
  type PromoGroup,
} from '../api/promocodes';
import { tariffsApi } from '../api/tariffs';
import { usePlatform } from '../platform/hooks/usePlatform';
import { BackIcon, RefreshIcon } from '@/components/icons';

// valid_until is created as end-of-day in the admin's LOCAL tz, then stored/returned
// as a UTC instant. Reading the picker back must convert UTC -> local date, otherwise
// negative-offset admins see tomorrow's date and re-saving drifts the expiry forward a
// day each time. (Mirror of DateField's local toISO; must NOT slice the raw UTC string.)
const utcInstantToLocalDateInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function AdminPromocodeCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const isEdit = !!id;

  // Form state.
  // Режим формы: «набор бонусов» (баланс/дни/промогруппа чекбоксами — тип
  // промокода выводится из выбранной комбинации) либо особые типы, которые не
  // комбинируются: триал и процентная скидка (скидка переиспользует те же
  // колонки с другой семантикой — процент/часы).
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'bonus_set' | 'trial_subscription' | 'discount'>('bonus_set');
  const [includeBalance, setIncludeBalance] = useState(true);
  const [includeDays, setIncludeDays] = useState(false);
  const [includeGroup, setIncludeGroup] = useState(false);
  const [balanceBonusRubles, setBalanceBonusRubles] = useState<number | ''>(0);
  const [subscriptionDays, setSubscriptionDays] = useState<number | ''>(0);
  const [maxUses, setMaxUses] = useState<number | ''>(1);
  const [isActive, setIsActive] = useState(true);
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(false);
  const [validUntil, setValidUntil] = useState('');
  const [promoGroupId, setPromoGroupId] = useState<number | null>(null);
  const [tariffId, setTariffId] = useState<number | null>(null);

  // Fetch promo groups (for promo_group type)
  const { data: promoGroupsData } = useQuery({
    queryKey: ['admin-promo-groups'],
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
  });

  const promoGroups: PromoGroup[] = promoGroupsData?.items || [];

  // Fetch tariffs to show trial tariff info
  const { data: tariffsData } = useQuery({
    queryKey: ['admin-tariffs-for-promo'],
    queryFn: () => tariffsApi.getTariffs(true),
    enabled: mode === 'trial_subscription',
  });

  const trialTariff = tariffsData?.tariffs?.find((t) => t.is_trial_available) || null;

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
      if (data.type === 'trial_subscription' || data.type === 'discount') {
        setMode(data.type);
      } else {
        setMode('bonus_set');
        setIncludeBalance(data.type === 'balance' || data.type === 'balance_and_days');
        setIncludeDays(data.type === 'subscription_days' || data.type === 'balance_and_days');
        // Промогруппа комбинируется с любым составом (bэкенд назначает её
        // независимо от типа), поэтому чекбокс — по факту наличия группы
        setIncludeGroup(data.type === 'promo_group' || !!data.promo_group_id);
      }
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
      setValidUntil(data.valid_until ? utcInstantToLocalDateInput(data.valid_until) : '');
      setPromoGroupId(data.promo_group_id || null);
      setTariffId(data.tariff_id || null);
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

  // Тип промокода выводится из режима и выбранных чекбоксов. «Только
  // промогруппа» — легаси-тип promo_group; группа в комбинации с балансом/днями
  // едет через promo_group_id при любом типе (бэкенд применяет её независимо).
  const derivedType: PromoCodeType =
    mode === 'bonus_set'
      ? includeBalance && includeDays
        ? 'balance_and_days'
        : includeBalance
          ? 'balance'
          : includeDays
            ? 'subscription_days'
            : 'promo_group'
      : mode;

  const handleSubmit = () => {
    // For discount: balance_bonus_kopeks = percent (integer), subscription_days = hours
    // For balance: balance_bonus_kopeks = rubles * 100
    const balanceValue = balanceBonusRubles === '' ? 0 : balanceBonusRubles;
    const daysValue = subscriptionDays === '' ? 0 : subscriptionDays;
    const maxUsesValue = maxUses === '' ? 0 : maxUses;

    const data: PromoCodeCreateRequest | PromoCodeUpdateRequest = {
      code: code.trim().toUpperCase(),
      type: derivedType,
      balance_bonus_kopeks:
        mode === 'discount'
          ? Math.round(balanceValue) // percent as integer
          : mode === 'bonus_set' && includeBalance
            ? Math.round(balanceValue * 100) // rubles to kopeks
            : 0,
      subscription_days:
        mode === 'discount' ||
        mode === 'trial_subscription' ||
        (mode === 'bonus_set' && includeDays)
          ? daysValue
          : 0,
      max_uses: maxUsesValue,
      is_active: isActive,
      first_purchase_only: firstPurchaseOnly,
      // The picker yields a date-only 'YYYY-MM-DD'. A promo "valid until D" must
      // stay valid through the WHOLE of day D, so anchor to end-of-day in the
      // admin's local timezone. `new Date('YYYY-MM-DD')` parses as UTC midnight
      // (the START of the day) — for a GMT+3 admin that made a code picked for
      // "today" already expired by 3am, surfacing as a bogus "expired" error.
      valid_until: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null,
      promo_group_id: mode === 'bonus_set' && includeGroup ? promoGroupId : null,
      ...(mode === 'trial_subscription' && tariffId ? { tariff_id: tariffId } : {}),
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

  // Collect validation errors for display
  const validationErrors: string[] = [];
  if (!isCodeValid) {
    validationErrors.push('codeRequired');
  }
  if (mode === 'bonus_set') {
    if (!includeBalance && !includeDays && !includeGroup) {
      validationErrors.push('bonusSetEmpty');
    }
    if (includeBalance && balanceValue <= 0) {
      validationErrors.push('balanceRequired');
    }
    if (includeDays && daysValue <= 0) {
      validationErrors.push('daysRequired');
    }
    if (includeGroup && !promoGroupId) {
      validationErrors.push('groupRequired');
    }
  }
  if (mode === 'trial_subscription' && daysValue <= 0) {
    validationErrors.push('daysRequired');
  }
  if (mode === 'discount') {
    if (balanceValue <= 0 || balanceValue > 100) {
      validationErrors.push('discountPercentInvalid');
    }
    // 0 часов = «бессрочно до первой покупки» — разрешено (как в isValid до
    // унификации; раньше isValid и список ошибок противоречили друг другу)
    if (daysValue < 0) {
      validationErrors.push('discountHoursRequired');
    }
  }

  const isValid = (): boolean => validationErrors.length === 0;

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
          <label htmlFor="pc-code" className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.code')}
            <span className="text-error-400">*</span>
          </label>
          <input
            id="pc-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`input uppercase ${!isCodeValid && code.length > 0 ? 'border-error-500/50' : ''}`}
            placeholder="SUMMER2025"
            maxLength={50}
          />
        </div>

        {/* Type */}
        <div>
          <label htmlFor="pc-type" className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.type')}
          </label>
          <select
            id="pc-type"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="input"
          >
            <option value="bonus_set">{t('admin.promocodes.form.typeBonusSet')}</option>
            <option value="trial_subscription">
              {t('admin.promocodes.form.typeTrialSubscription')}
            </option>
            <option value="discount">{t('admin.promocodes.form.typeDiscount')}</option>
          </select>
        </div>

        {/* Состав набора бонусов — любая комбинация чекбоксами */}
        {mode === 'bonus_set' && (
          <div>
            <div className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.promocodes.form.bonusComposition')}
              <span className="text-error-400">*</span>
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  ['includeBalance', includeBalance, setIncludeBalance] as const,
                  ['includeDays', includeDays, setIncludeDays] as const,
                  ['includePromoGroup', includeGroup, setIncludeGroup] as const,
                ] as const
              ).map(([key, checked, setChecked]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChecked(!checked)}
                    role="switch"
                    aria-checked={checked}
                    aria-label={t(`admin.promocodes.form.${key}`)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      checked ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        checked ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-dark-200">{t(`admin.promocodes.form.${key}`)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Type-specific fields */}
        {mode === 'bonus_set' && includeBalance && (
          <div>
            <label
              htmlFor="pc-balance-bonus"
              className="mb-2 block text-sm font-medium text-dark-300"
            >
              {t('admin.promocodes.form.bonusAmount')}
              <span className="text-error-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="pc-balance-bonus"
                type="number"
                value={balanceBonusRubles}
                onChange={createNumberInputHandler(setBalanceBonusRubles, 0)}
                className="input w-32"
                min={0}
                step={1}
                placeholder="0"
              />
              <span className="text-dark-400">{t('admin.promocodes.form.rub')}</span>
            </div>
          </div>
        )}

        {(mode === 'trial_subscription' || (mode === 'bonus_set' && includeDays)) && (
          <div>
            <label htmlFor="pc-sub-days" className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.promocodes.form.daysCount')}
              <span className="text-error-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                id="pc-sub-days"
                type="number"
                value={subscriptionDays}
                onChange={createNumberInputHandler(setSubscriptionDays, 0)}
                className="input w-32"
                min={1}
                placeholder="0"
              />
              <span className="text-dark-400">{t('admin.promocodes.form.days')}</span>
            </div>
          </div>
        )}

        {mode === 'trial_subscription' && (
          <div>
            <label htmlFor="pc-tariff" className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.promocodes.form.tariff', 'Тариф')}
            </label>
            <select
              id="pc-tariff"
              value={tariffId || ''}
              onChange={(e) => setTariffId(e.target.value ? parseInt(e.target.value) : null)}
              className="input"
            >
              <option value="">
                {trialTariff
                  ? t('admin.promocodes.form.defaultTrialTariff', 'По умолчанию: {{name}}', {
                      name: trialTariff.name,
                    })
                  : t('admin.promocodes.form.selectTariff', '— Выберите тариф —')}
              </option>
              {tariffsData?.tariffs?.map((tariff) => (
                <option key={tariff.id} value={tariff.id}>
                  {tariff.name} ({tariff.traffic_limit_gb} GB, {tariff.device_limit} устр.)
                </option>
              ))}
            </select>
            {!tariffId && !trialTariff && (
              <div className="mt-1 text-xs text-warning-400">
                {t(
                  'admin.promocodes.form.noTrialTariffHint',
                  'Выберите тариф или отметьте тариф как «доступен для триала» в настройках.',
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'bonus_set' && includeGroup && (
          <div>
            <label
              htmlFor="pc-promo-group"
              className="mb-2 block text-sm font-medium text-dark-300"
            >
              {t('admin.promocodes.form.discountGroup')}
              <span className="text-error-400">*</span>
            </label>
            <select
              id="pc-promo-group"
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

        {mode === 'discount' && (
          <>
            <div>
              <label
                htmlFor="pc-discount-percent"
                className="mb-2 block text-sm font-medium text-dark-300"
              >
                {t('admin.promocodes.form.discountPercent')}
                <span className="text-error-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="pc-discount-percent"
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
              <label
                htmlFor="pc-discount-validity"
                className="mb-2 block text-sm font-medium text-dark-300"
              >
                {t('admin.promocodes.form.validityPeriod')}
                <span className="text-error-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="pc-discount-validity"
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
                  min={0}
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
          <label htmlFor="pc-max-uses" className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.maxUses')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="pc-max-uses"
              type="number"
              value={maxUses}
              onChange={createNumberInputHandler(setMaxUses, 0)}
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
          <label htmlFor="pc-valid-until" className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.promocodes.form.validUntil')}
          </label>
          <DateField
            value={validUntil}
            onChange={setValidUntil}
            className="flex w-full items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-100 transition-colors hover:border-accent-500/50"
          />
          <p className="mt-1 text-xs text-dark-500">{t('admin.promocodes.form.validUntilHint')}</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              role="switch"
              aria-checked={isActive}
              aria-label={t('admin.promocodes.form.active')}
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
              role="switch"
              aria-checked={firstPurchaseOnly}
              aria-label={t('admin.promocodes.form.firstPurchaseOnly')}
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
            {isLoading && <RefreshIcon spinning />}
            {isLoading ? t('admin.promocodes.form.saving') : t('admin.promocodes.form.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
