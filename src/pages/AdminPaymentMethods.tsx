import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminPaymentMethodsApi } from '../api/adminPaymentMethods';
import type { PaymentMethodConfig, PromoGroupSimple } from '../types';

// ============ Icons ============

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

const GripIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

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

// ============ Method icon by type ============

const METHOD_ICONS: Record<string, string> = {
  telegram_stars: '\u2B50',
  tribute: '\uD83C\uDF81',
  cryptobot: '\uD83E\uDE99',
  heleket: '\u26A1',
  yookassa: '\uD83C\uDFE6',
  mulenpay: '\uD83D\uDCB3',
  pal24: '\uD83D\uDCB8',
  platega: '\uD83D\uDCB0',
  wata: '\uD83D\uDCA7',
  freekassa: '\uD83D\uDCB5',
  cloudpayments: '\u2601\uFE0F',
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
};

// ============ Sortable Card ============

interface SortableCardProps {
  config: PaymentMethodConfig;
  onClick: () => void;
}

function SortablePaymentCard({ config, onClick }: SortableCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: config.method_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  const displayName = config.display_name || config.default_display_name;
  const icon = METHOD_ICONS[config.method_id] || '\uD83D\uDCB3';

  // Build condition summary chips
  const chips: string[] = [];
  if (config.user_type_filter === 'telegram')
    chips.push(t('admin.paymentMethods.userTypeTelegram', 'Telegram'));
  if (config.user_type_filter === 'email')
    chips.push(t('admin.paymentMethods.userTypeEmail', 'Email'));
  if (config.first_topup_filter === 'yes')
    chips.push(t('admin.paymentMethods.firstTopupYes', 'C пополнением'));
  if (config.first_topup_filter === 'no')
    chips.push(t('admin.paymentMethods.firstTopupNo', 'Без пополнения'));
  if (config.promo_group_filter_mode === 'selected' && config.allowed_promo_group_ids.length > 0) {
    chips.push(
      `${config.allowed_promo_group_ids.length} ${t('admin.paymentMethods.promoGroupsShort', 'групп')}`,
    );
  }

  // Count enabled sub-options
  let subOptionsInfo = '';
  if (config.available_sub_options && config.sub_options) {
    const enabledCount = config.available_sub_options.filter(
      (o) => config.sub_options?.[o.id] !== false,
    ).length;
    const totalCount = config.available_sub_options.length;
    if (enabledCount < totalCount) {
      subOptionsInfo = `${enabledCount}/${totalCount}`;
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-xl border p-4 transition-all ${
        isDragging
          ? 'border-accent-500/50 bg-dark-700/80 shadow-xl shadow-accent-500/10'
          : config.is_enabled
            ? 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
            : 'border-dark-800/50 bg-dark-900/30 opacity-60'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab touch-manipulation rounded-lg p-1.5 text-dark-500 hover:bg-dark-700/50 hover:text-dark-300 active:cursor-grabbing"
        title={t('admin.paymentMethods.dragToReorder', 'Перетащите для изменения порядка')}
      >
        <GripIcon />
      </button>

      {/* Method icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-dark-700/50 text-xl">
        {icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-dark-100">{displayName}</span>
          {config.is_enabled ? (
            <span className="flex-shrink-0 rounded-full border border-success-500/20 bg-success-500/15 px-2 py-0.5 text-xs text-success-400">
              {t('admin.paymentMethods.enabled', 'Вкл')}
            </span>
          ) : (
            <span className="flex-shrink-0 rounded-full border border-dark-700/30 bg-dark-700/50 px-2 py-0.5 text-xs text-dark-500">
              {t('admin.paymentMethods.disabled', 'Выкл')}
            </span>
          )}
          {!config.is_provider_configured && (
            <span className="flex-shrink-0 rounded-full border border-warning-500/20 bg-warning-500/15 px-2 py-0.5 text-xs text-warning-400">
              {t('admin.paymentMethods.notConfigured', 'Не настроен')}
            </span>
          )}
          {subOptionsInfo && (
            <span className="flex-shrink-0 rounded-full bg-dark-700/50 px-2 py-0.5 text-xs text-dark-400">
              {subOptionsInfo}
            </span>
          )}
        </div>

        {/* Condition chips */}
        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {chips.map((chip, i) => (
              <span
                key={i}
                className="rounded-md border border-accent-500/15 bg-accent-500/10 px-2 py-0.5 text-xs text-accent-400"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      <button
        onClick={onClick}
        className="flex-shrink-0 p-1 text-dark-500 transition-colors hover:text-dark-300"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}

// ============ Detail Modal ============

interface DetailModalProps {
  config: PaymentMethodConfig;
  promoGroups: PromoGroupSimple[];
  onClose: () => void;
  onSave: (methodId: string, data: Record<string, unknown>) => void;
  isSaving: boolean;
}

function PaymentMethodDetailModal({
  config,
  promoGroups,
  onClose,
  onSave,
  isSaving,
}: DetailModalProps) {
  const { t } = useTranslation();
  const displayName = config.display_name || config.default_display_name;
  const icon = METHOD_ICONS[config.method_id] || '\uD83D\uDCB3';

  // Local state for editing
  const [isEnabled, setIsEnabled] = useState(config.is_enabled);
  const [customName, setCustomName] = useState(config.display_name || '');
  const [subOptions, setSubOptions] = useState<Record<string, boolean>>(config.sub_options || {});
  const [minAmount, setMinAmount] = useState(config.min_amount_kopeks?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(config.max_amount_kopeks?.toString() || '');
  const [userTypeFilter, setUserTypeFilter] = useState(config.user_type_filter);
  const [firstTopupFilter, setFirstTopupFilter] = useState(config.first_topup_filter);
  const [promoGroupFilterMode, setPromoGroupFilterMode] = useState(config.promo_group_filter_mode);
  const [selectedPromoGroupIds, setSelectedPromoGroupIds] = useState<number[]>(
    config.allowed_promo_group_ids,
  );

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSave = () => {
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

    onSave(config.method_id, data);
  };

  const togglePromoGroup = (id: number) => {
    setSelectedPromoGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative m-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-dark-700 bg-dark-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-dark-700 bg-dark-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-700/50 text-xl">
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark-50">{displayName}</h2>
              <p className="text-xs text-dark-500">
                {METHOD_LABELS[config.method_id] || config.method_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-dark-200">
                {t('admin.paymentMethods.methodEnabled', 'Метод включён')}
              </div>
              {!config.is_provider_configured && (
                <div className="mt-0.5 text-xs text-warning-400">
                  {t('admin.paymentMethods.providerNotConfigured', 'Провайдер не настроен в env')}
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
              {t('admin.paymentMethods.displayName', 'Отображаемое имя')}
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={config.default_display_name}
              className="w-full rounded-xl border border-dark-700 bg-dark-900/50 px-4 py-2.5 text-dark-100 transition-colors placeholder:text-dark-500 focus:border-accent-500/50 focus:outline-none"
            />
            <p className="mt-1 text-xs text-dark-500">
              {t('admin.paymentMethods.displayNameHint', 'Оставьте пустым для имени по умолчанию')}:{' '}
              {config.default_display_name}
            </p>
          </div>

          {/* Sub-options */}
          {config.available_sub_options && config.available_sub_options.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-200">
                {t('admin.paymentMethods.subOptions', 'Варианты оплаты')}
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
                          enabled
                            ? 'bg-accent-500 text-white'
                            : 'border border-dark-600 bg-dark-700'
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
                {t('admin.paymentMethods.minAmount', 'Мин. сумма (коп.)')}
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder={config.default_min_amount_kopeks.toString()}
                className="w-full rounded-xl border border-dark-700 bg-dark-900/50 px-4 py-2.5 text-dark-100 transition-colors placeholder:text-dark-500 focus:border-accent-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-200">
                {t('admin.paymentMethods.maxAmount', 'Макс. сумма (коп.)')}
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder={config.default_max_amount_kopeks.toString()}
                className="w-full rounded-xl border border-dark-700 bg-dark-900/50 px-4 py-2.5 text-dark-100 transition-colors placeholder:text-dark-500 focus:border-accent-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Display conditions */}
          <div className="border-t border-dark-700 pt-3">
            <h3 className="mb-4 text-sm font-semibold text-dark-200">
              {t('admin.paymentMethods.conditions', 'Условия отображения')}
            </h3>

            {/* User type filter */}
            <div className="mb-4">
              <label className="mb-2 block text-sm text-dark-300">
                {t('admin.paymentMethods.userTypeFilter', 'Тип пользователя')}
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
                      ? t('admin.paymentMethods.userTypeAll', 'Все')
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
                {t('admin.paymentMethods.firstTopupFilter', 'Первое пополнение')}
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
                      ? t('admin.paymentMethods.firstTopupAny', 'Не важно')
                      : val === 'yes'
                        ? t('admin.paymentMethods.firstTopupYes', 'Было')
                        : t('admin.paymentMethods.firstTopupNo', 'Не было')}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo groups filter */}
            <div>
              <label className="mb-2 block text-sm text-dark-300">
                {t('admin.paymentMethods.promoGroupFilter', 'Промо-группы')}
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
                      ? t('admin.paymentMethods.promoGroupAll', 'Все группы')
                      : t('admin.paymentMethods.promoGroupSelected', 'Выбранные')}
                  </button>
                ))}
              </div>

              {promoGroupFilterMode === 'selected' && (
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-dark-700/50 bg-dark-900/30 p-3">
                  {promoGroups.length === 0 ? (
                    <p className="py-2 text-center text-sm text-dark-500">
                      {t('admin.paymentMethods.noPromoGroups', 'Нет промо-групп')}
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

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center gap-3 rounded-b-2xl border-t border-dark-700 bg-dark-800 p-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-dark-700 px-4 py-2.5 font-medium text-dark-300 transition-colors hover:bg-dark-600"
          >
            {t('common.cancel', 'Отмена')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-400 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <SaveIcon />
            )}
            {t('common.save', 'Сохранить')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Toast ============

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-fade-in items-center gap-2 rounded-xl bg-success-500/90 px-5 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
      <CheckIcon />
      {message}
    </div>
  );
}

// ============ Main Page ============

export default function AdminPaymentMethods() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodConfig | null>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch payment methods
  const { data: fetchedMethods, isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: adminPaymentMethodsApi.getAll,
  });

  // Fetch promo groups
  const { data: promoGroups = [] } = useQuery({
    queryKey: ['admin-payment-methods-promo-groups'],
    queryFn: adminPaymentMethodsApi.getPromoGroups,
  });

  // Sync fetched data to local state
  useEffect(() => {
    if (fetchedMethods && !orderChanged) {
      setMethods(fetchedMethods);
    }
  }, [fetchedMethods, orderChanged]);

  // Save order mutation
  const saveOrderMutation = useMutation({
    mutationFn: (methodIds: string[]) => adminPaymentMethodsApi.updateOrder(methodIds),
    onSuccess: () => {
      setOrderChanged(false);
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      setToastMessage(t('admin.paymentMethods.orderSaved', 'Порядок сохранён'));
    },
    onError: () => {
      setToastMessage(t('common.error', 'Ошибка'));
    },
  });

  // Update method mutation
  const updateMethodMutation = useMutation({
    mutationFn: ({ methodId, data }: { methodId: string; data: Record<string, unknown> }) =>
      adminPaymentMethodsApi.update(methodId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      setSelectedMethod(null);
      setToastMessage(t('admin.paymentMethods.saved', 'Настройки сохранены'));
    },
    onError: () => {
      setToastMessage(t('common.error', 'Ошибка'));
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMethods((prev) => {
        const oldIndex = prev.findIndex((m) => m.method_id === active.id);
        const newIndex = prev.findIndex((m) => m.method_id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      setOrderChanged(true);
    }
  }, []);

  const handleSaveOrder = () => {
    saveOrderMutation.mutate(methods.map((m) => m.method_id));
  };

  const handleSaveMethod = (methodId: string, data: Record<string, unknown>) => {
    updateMethodMutation.mutate({ methodId, data });
  };

  const handleCloseToast = useCallback(() => setToastMessage(null), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-50">
              {t('admin.paymentMethods.title', 'Платёжные методы')}
            </h1>
            <p className="text-sm text-dark-400">
              {t('admin.paymentMethods.description', 'Настройка порядка и условий отображения')}
            </p>
          </div>
        </div>
        {orderChanged && (
          <button
            onClick={handleSaveOrder}
            disabled={saveOrderMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {saveOrderMutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <SaveIcon />
            )}
            {t('admin.paymentMethods.saveOrder', 'Сохранить порядок')}
          </button>
        )}
      </div>

      {/* Drag hint */}
      <div className="flex items-center gap-2 text-sm text-dark-500">
        <GripIcon />
        {t(
          'admin.paymentMethods.dragHint',
          'Перетаскивайте карточки для изменения порядка. Нажмите для настройки.',
        )}
      </div>

      {/* Methods list */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : methods.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={methods.map((m) => m.method_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {methods.map((config) => (
                  <SortablePaymentCard
                    key={config.method_id}
                    config={config}
                    onClick={() => setSelectedMethod(config)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
              <span className="text-3xl">{'\uD83D\uDCB3'}</span>
            </div>
            <div className="text-dark-400">
              {t('admin.paymentMethods.noMethods', 'Нет настроенных платёжных методов')}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedMethod && (
        <PaymentMethodDetailModal
          config={selectedMethod}
          promoGroups={promoGroups}
          onClose={() => setSelectedMethod(null)}
          onSave={handleSaveMethod}
          isSaving={updateMethodMutation.isPending}
        />
      )}

      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} onClose={handleCloseToast} />}
    </div>
  );
}
