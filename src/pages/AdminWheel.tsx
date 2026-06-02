import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
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
import { adminWheelApi, type WheelPrizeAdmin, type CreateWheelPrizeData } from '../api/wheel';
import { adminPaymentMethodsApi } from '../api/adminPaymentMethods';
import { useDestructiveConfirm } from '@/platform';
import { useNotify } from '@/platform/hooks/useNotify';
import FortuneWheel from '../components/wheel/FortuneWheel';
import { ColorPicker } from '@/components/ColorPicker';
import {
  AdjustmentsIcon,
  BackIcon,
  ChartIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  GiftIcon,
  GripVerticalIcon,
  PlusIcon,
  StarIcon,
  TicketIcon,
  TrashIcon,
  XMarkIcon,
} from '@/components/icons';
import { usePlatform } from '../platform/hooks/usePlatform';
import { toNumber } from '../utils/inputHelpers';

const PRIZE_TYPE_KEYS = [
  { value: 'subscription_days', key: 'subscription_days', emoji: '📅' },
  { value: 'balance_bonus', key: 'balance_bonus', emoji: '💰' },
  { value: 'traffic_gb', key: 'traffic_gb', emoji: '📊' },
  { value: 'promocode', key: 'promocode', emoji: '🎟️' },
  { value: 'nothing', key: 'nothing', emoji: '😔' },
];

type Tab = 'settings' | 'prizes' | 'statistics';

interface SortablePrizeCardProps {
  prize: WheelPrizeAdmin;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onSave: (data: Partial<WheelPrizeAdmin>) => void;
  isLoading?: boolean;
}

function SortablePrizeCard({
  prize,
  isExpanded,
  onToggleExpand,
  onDelete,
  onSave,
  isLoading,
}: SortablePrizeCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prize.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex flex-col rounded-xl border ${
        isDragging
          ? 'border-accent-500/50 bg-dark-800 shadow-xl shadow-accent-500/20'
          : prize.is_active
            ? 'border-dark-700/50 bg-dark-800/50'
            : 'border-dark-800/50 bg-dark-900/30 opacity-60'
      }`}
    >
      {/* Prize header - always visible */}
      <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-dark-500 hover:bg-dark-700/50 hover:text-dark-300 active:cursor-grabbing sm:p-2.5"
          title={t('admin.wheel.prizes.dragToReorder')}
        >
          <GripVerticalIcon />
        </button>

        {/* Prize icon */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg sm:h-10 sm:w-10 sm:text-xl"
          style={{ backgroundColor: prize.color + '30' }}
        >
          {prize.emoji}
        </div>

        {/* Prize info */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-dark-100">{prize.display_name}</div>
          <div className="truncate text-xs text-dark-400 sm:text-sm">
            {t(`admin.wheel.prizes.types.${prize.prize_type}`)} •{' '}
            {(prize.prize_value_kopeks / 100).toFixed(0)}₽
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            onClick={onToggleExpand}
            className="btn-ghost p-1.5 sm:p-2"
            title={isExpanded ? t('common.collapse') : t('common.edit')}
          >
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost p-1.5 text-error-400 hover:bg-error-500/10 sm:p-2"
            title={t('common.delete')}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Expanded edit form */}
      {isExpanded && (
        <div className="border-t border-dark-700 bg-dark-800/50 p-4">
          <InlinePrizeForm
            prize={prize}
            onSave={onSave}
            onCancel={onToggleExpand}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminWheel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirmDelete = useDestructiveConfirm();
  const { capabilities } = usePlatform();
  const notify = useNotify();

  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [expandedPrizeId, setExpandedPrizeId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localPrizeOrder, setLocalPrizeOrder] = useState<number[] | null>(null);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<{
    is_enabled: boolean;
    spin_cost_stars: number | '';
    spin_cost_stars_enabled: boolean;
    spin_cost_days: number | '';
    spin_cost_days_enabled: boolean;
    rtp_percent: number;
    daily_spin_limit: number | '';
    min_subscription_days_for_day_payment: number | '';
    promo_prefix: string;
  } | null>(null);

  // Fetch config
  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-wheel-config'],
    queryFn: adminWheelApi.getConfig,
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-wheel-stats'],
    queryFn: () => adminWheelApi.getStatistics(),
    enabled: activeTab === 'statistics',
  });

  // Initialize settings form when config is loaded
  useEffect(() => {
    if (config) {
      setSettingsForm((prev) => {
        if (prev) return prev; // Already initialized, don't overwrite
        return {
          is_enabled: config.is_enabled,
          spin_cost_stars: config.spin_cost_stars,
          spin_cost_stars_enabled: config.spin_cost_stars_enabled,
          spin_cost_days: config.spin_cost_days,
          spin_cost_days_enabled: config.spin_cost_days_enabled,
          rtp_percent: config.rtp_percent,
          daily_spin_limit: config.daily_spin_limit,
          min_subscription_days_for_day_payment: config.min_subscription_days_for_day_payment,
          promo_prefix: config.promo_prefix,
        };
      });
    }
  }, [config]);

  // Check if settings form has changes
  const hasSettingsChanges =
    settingsForm &&
    config &&
    (settingsForm.is_enabled !== config.is_enabled ||
      settingsForm.spin_cost_stars !== config.spin_cost_stars ||
      settingsForm.spin_cost_stars_enabled !== config.spin_cost_stars_enabled ||
      settingsForm.spin_cost_days !== config.spin_cost_days ||
      settingsForm.spin_cost_days_enabled !== config.spin_cost_days_enabled ||
      settingsForm.rtp_percent !== config.rtp_percent ||
      settingsForm.daily_spin_limit !== config.daily_spin_limit ||
      settingsForm.min_subscription_days_for_day_payment !==
        config.min_subscription_days_for_day_payment ||
      settingsForm.promo_prefix !== config.promo_prefix);

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: adminWheelApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] });
      queryClient.invalidateQueries({ queryKey: ['wheel-config'] });
      setSettingsForm(null); // Reset form so it reloads from config
    },
  });

  // Prize mutations
  const createPrizeMutation = useMutation({
    mutationFn: adminWheelApi.createPrize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] });
      setIsCreating(false);
    },
  });

  const updatePrizeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WheelPrizeAdmin> }) =>
      adminWheelApi.updatePrize(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] });
      setExpandedPrizeId(null);
    },
  });

  // Reorder prizes mutation
  const reorderPrizesMutation = useMutation({
    mutationFn: adminWheelApi.reorderPrizes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] });
      // Reset local state after successful save
      setLocalPrizeOrder(null);
      setHasUnsavedOrder(false);
    },
  });

  // Delete prize mutation
  const deletePrizeMutation = useMutation({
    mutationFn: adminWheelApi.deletePrize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] });
    },
  });

  // Handle delete with native confirm
  const handleDeletePrize = useCallback(
    async (prizeId: number) => {
      const confirmed = await confirmDelete(
        t('admin.wheel.prizes.confirmDelete'),
        t('common.delete'),
        t('admin.wheel.prizes.deletePrize'),
      );
      if (confirmed) {
        deletePrizeMutation.mutate(prizeId);
      }
    },
    [confirmDelete, deletePrizeMutation, t],
  );

  // DnD sensors - PointerSensor handles both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(() => {
    // Collapse expanded card to avoid collision detection issues with varying heights
    setExpandedPrizeId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id && config) {
        // Use current displayed order (either local or from config)
        const currentPrizes = localPrizeOrder
          ? localPrizeOrder
              .map((id) => config.prizes.find((p) => p.id === id))
              .filter((p): p is WheelPrizeAdmin => p !== undefined)
          : config.prizes;

        const oldIndex = currentPrizes.findIndex((p) => p.id === active.id);
        const newIndex = currentPrizes.findIndex((p) => p.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(currentPrizes, oldIndex, newIndex);
          // Save order locally, don't trigger mutation immediately
          setLocalPrizeOrder(newOrder.map((p) => p.id));
          setHasUnsavedOrder(true);
        }
      }
    },
    [config, localPrizeOrder],
  );

  // Save prize order
  const handleSavePrizeOrder = useCallback(() => {
    if (localPrizeOrder) {
      reorderPrizesMutation.mutate(localPrizeOrder);
      setHasUnsavedOrder(false);
    }
  }, [localPrizeOrder, reorderPrizesMutation]);

  // Discard order changes
  const handleDiscardOrderChanges = useCallback(() => {
    setLocalPrizeOrder(null);
    setHasUnsavedOrder(false);
  }, []);

  // Get prizes in display order (use local order if available)
  const displayedPrizes = config?.prizes
    ? localPrizeOrder
      ? localPrizeOrder
          .map((id) => config.prizes.find((p) => p.id === id))
          .filter((p): p is WheelPrizeAdmin => p !== undefined)
      : config.prizes
    : [];

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!config) {
    return <div className="py-12 text-center text-dark-400">{t('wheel.errors.loadFailed')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <h1 className="text-xl font-bold text-dark-50 sm:text-2xl">{t('admin.wheel.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm ${
              config.is_enabled
                ? 'bg-success-500/20 text-success-400'
                : 'bg-error-500/20 text-error-400'
            }`}
          >
            {config.is_enabled ? t('admin.wheel.enabled') : t('admin.wheel.disabled')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 border-b border-dark-700 pb-2 sm:gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors sm:gap-2 sm:px-4 sm:text-base ${
              activeTab === 'settings'
                ? 'border-b-2 border-accent-500 bg-dark-800 text-accent-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <CogIcon />
            {t('admin.wheel.tabs.settings')}
          </button>
          <button
            onClick={() => setActiveTab('prizes')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors sm:gap-2 sm:px-4 sm:text-base ${
              activeTab === 'prizes'
                ? 'border-b-2 border-accent-500 bg-dark-800 text-accent-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <GiftIcon className="h-5 w-5" />
            {t('admin.wheel.tabs.prizes')} ({config.prizes.length})
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors sm:gap-2 sm:px-4 sm:text-base ${
              activeTab === 'statistics'
                ? 'border-b-2 border-accent-500 bg-dark-800 text-accent-400'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <ChartIcon className="h-5 w-5" />
            {t('admin.wheel.tabs.statistics')}
          </button>
        </div>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card space-y-6 p-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-dark-100">
                {t('admin.wheel.settings.enableWheel')}
              </h3>
              <p className="text-sm text-dark-400">{t('admin.wheel.settings.allowSpins')}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettingsForm((prev) => (prev ? { ...prev, is_enabled: !prev.is_enabled } : null))
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${
                (settingsForm?.is_enabled ?? config.is_enabled) ? 'bg-accent-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  (settingsForm?.is_enabled ?? config.is_enabled)
                    ? 'translate-x-5'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <hr className="border-dark-700" />

          {/* Spin Cost Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-dark-400">
              <StarIcon className="h-4 w-4" />
              {t('admin.wheel.settings.spinCost')}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.costInStars')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settingsForm?.spin_cost_stars ?? config.spin_cost_stars}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '')
                        return setSettingsForm((prev) =>
                          prev ? { ...prev, spin_cost_stars: '' } : null,
                        );
                      const num = parseInt(val);
                      if (!isNaN(num))
                        setSettingsForm((prev) =>
                          prev ? { ...prev, spin_cost_stars: num } : null,
                        );
                    }}
                    min={1}
                    max={1000}
                    className="input flex-1"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        settingsForm?.spin_cost_stars_enabled ?? config.spin_cost_stars_enabled
                      }
                      onChange={(e) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, spin_cost_stars_enabled: e.target.checked } : null,
                        )
                      }
                      className="rounded border-dark-600"
                    />
                    <span className="text-sm text-dark-400">{t('admin.wheel.enabled')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.costInDays')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settingsForm?.spin_cost_days ?? config.spin_cost_days}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '')
                        return setSettingsForm((prev) =>
                          prev ? { ...prev, spin_cost_days: '' } : null,
                        );
                      const num = parseInt(val);
                      if (!isNaN(num))
                        setSettingsForm((prev) => (prev ? { ...prev, spin_cost_days: num } : null));
                    }}
                    min={1}
                    max={30}
                    className="input flex-1"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        settingsForm?.spin_cost_days_enabled ?? config.spin_cost_days_enabled
                      }
                      onChange={(e) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, spin_cost_days_enabled: e.target.checked } : null,
                        )
                      }
                      className="rounded border-dark-600"
                    />
                    <span className="text-sm text-dark-400">{t('admin.wheel.enabled')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-dark-700" />

          {/* Limits & RTP Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-dark-400">
              <AdjustmentsIcon className="h-4 w-4" />
              {t('admin.wheel.settings.limitsAndRtp')}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.rtpPercent')}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settingsForm?.rtp_percent ?? config.rtp_percent}
                  onChange={(e) =>
                    setSettingsForm((prev) =>
                      prev ? { ...prev, rtp_percent: parseInt(e.target.value) } : null,
                    )
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-dark-400">
                  <span>0%</span>
                  <span className="font-bold text-accent-400">
                    {settingsForm?.rtp_percent ?? config.rtp_percent}%
                  </span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.dailyLimit')}
                </label>
                <input
                  type="number"
                  value={settingsForm?.daily_spin_limit ?? config.daily_spin_limit}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '')
                      return setSettingsForm((prev) =>
                        prev ? { ...prev, daily_spin_limit: '' } : null,
                      );
                    const num = parseInt(val);
                    if (!isNaN(num))
                      setSettingsForm((prev) => (prev ? { ...prev, daily_spin_limit: num } : null));
                  }}
                  min={0}
                  max={100}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.minSubDays')}
                </label>
                <input
                  type="number"
                  value={
                    settingsForm?.min_subscription_days_for_day_payment ??
                    config.min_subscription_days_for_day_payment
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '')
                      return setSettingsForm((prev) =>
                        prev ? { ...prev, min_subscription_days_for_day_payment: '' } : null,
                      );
                    const num = parseInt(val);
                    if (!isNaN(num))
                      setSettingsForm((prev) =>
                        prev ? { ...prev, min_subscription_days_for_day_payment: num } : null,
                      );
                  }}
                  min={1}
                  max={30}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          <hr className="border-dark-700" />

          {/* Promocodes Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium text-dark-400">
              <TicketIcon className="h-4 w-4" />
              {t('admin.wheel.settings.promocodes')}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.promoPrefix')}
                </label>
                <input
                  type="text"
                  value={settingsForm?.promo_prefix ?? config.promo_prefix}
                  onChange={(e) =>
                    setSettingsForm((prev) =>
                      prev ? { ...prev, promo_prefix: e.target.value } : null,
                    )
                  }
                  maxLength={20}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasSettingsChanges && (
            <div className="flex justify-end border-t border-dark-700 pt-6">
              <button
                onClick={async () => {
                  if (!settingsForm) return;
                  if (settingsForm.spin_cost_stars_enabled) {
                    try {
                      const methods = await adminPaymentMethodsApi.getAll();
                      const starsMethod = methods.find((m) => m.method_id === 'telegram_stars');
                      if (!starsMethod?.is_enabled) {
                        notify.warning(t('admin.wheel.starsNotEnabledGlobally'));
                        return;
                      }
                    } catch {
                      // If we can't check, allow saving
                    }
                  }
                  updateConfigMutation.mutate({
                    ...settingsForm,
                    spin_cost_stars: toNumber(settingsForm.spin_cost_stars, config.spin_cost_stars),
                    spin_cost_days: toNumber(settingsForm.spin_cost_days, config.spin_cost_days),
                    daily_spin_limit: toNumber(
                      settingsForm.daily_spin_limit,
                      config.daily_spin_limit,
                    ),
                    min_subscription_days_for_day_payment: toNumber(
                      settingsForm.min_subscription_days_for_day_payment,
                      config.min_subscription_days_for_day_payment,
                    ),
                  });
                }}
                disabled={updateConfigMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {updateConfigMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <CheckIcon className="h-5 w-5" />
                )}
                {t('common.save')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prizes Tab */}
      {activeTab === 'prizes' && (
        <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
          {/* Prize list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-dark-400">{t('admin.wheel.prizes.dragToReorder')}</p>
              <button
                onClick={() => setIsCreating(true)}
                className="btn-primary flex flex-shrink-0 items-center gap-2"
              >
                <PlusIcon />
                <span className="hidden sm:inline">{t('admin.wheel.prizes.addPrize')}</span>
              </button>
            </div>

            {/* Unsaved order changes banner */}
            {hasUnsavedOrder && (
              <div className="flex items-center gap-3 rounded-xl border border-warning-500/30 bg-warning-500/10 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning-400">
                    {t('admin.wheel.prizes.unsavedOrder') || 'Есть несохраненные изменения порядка'}
                  </p>
                  <p className="text-xs text-warning-400/70">
                    {t('admin.wheel.prizes.unsavedOrderHint') ||
                      'Сохраните изменения или отмените их'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDiscardOrderChanges}
                    className="rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-dark-200 transition-colors hover:bg-dark-600"
                  >
                    {t('common.cancel') || 'Отменить'}
                  </button>
                  <button
                    onClick={handleSavePrizeOrder}
                    disabled={reorderPrizesMutation.isPending}
                    className="rounded-lg bg-warning-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-warning-600 disabled:opacity-50"
                  >
                    {reorderPrizesMutation.isPending
                      ? t('common.saving') || 'Сохранение...'
                      : t('common.save') || 'Сохранить'}
                  </button>
                </div>
              </div>
            )}

            {/* Create new prize inline form */}
            {isCreating && (
              <InlinePrizeForm
                prize={null}
                onSave={(data) => {
                  createPrizeMutation.mutate(data as CreateWheelPrizeData);
                }}
                onCancel={() => setIsCreating(false)}
                isLoading={createPrizeMutation.isPending}
              />
            )}

            {/* Prize list with DnD */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayedPrizes.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {displayedPrizes.map((prize) => (
                    <SortablePrizeCard
                      key={prize.id}
                      prize={prize}
                      isExpanded={expandedPrizeId === prize.id}
                      onToggleExpand={() =>
                        setExpandedPrizeId(expandedPrizeId === prize.id ? null : prize.id)
                      }
                      onDelete={() => handleDeletePrize(prize.id)}
                      onSave={(data) => updatePrizeMutation.mutate({ id: prize.id, data })}
                      isLoading={updatePrizeMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {config.prizes.length === 0 && !isCreating && (
              <div className="py-12 text-center text-dark-400">
                {t('admin.wheel.prizes.noPrizes')}
              </div>
            )}
          </div>

          {/* Wheel Preview */}
          <div className="hidden lg:sticky lg:top-24 lg:block">
            <div className="card p-4">
              <h3 className="mb-4 text-sm font-medium text-dark-400">{t('admin.wheel.preview')}</h3>
              <div className="mx-auto max-w-[250px]">
                <FortuneWheel
                  prizes={config.prizes}
                  isSpinning={false}
                  targetRotation={null}
                  onSpinComplete={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && stats && (
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-accent-400">{stats.total_spins}</div>
              <div className="text-sm text-dark-400">{t('admin.wheel.statistics.totalSpins')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-success-400">
                {(stats.total_revenue_kopeks / 100).toFixed(0)}₽
              </div>
              <div className="text-sm text-dark-400">{t('admin.wheel.statistics.revenue')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-warning-400">
                {(stats.total_payout_kopeks / 100).toFixed(0)}₽
              </div>
              <div className="text-sm text-dark-400">{t('admin.wheel.statistics.payouts')}</div>
            </div>
            <div className="card p-4 text-center">
              <div
                className={`text-3xl font-bold ${
                  stats.actual_rtp_percent <= stats.configured_rtp_percent
                    ? 'text-success-400'
                    : 'text-error-400'
                }`}
              >
                {stats.actual_rtp_percent.toFixed(1)}%
              </div>
              <div className="text-sm text-dark-400">
                {t('admin.wheel.statistics.actualRtp')} ({t('admin.wheel.statistics.targetRtp')}:{' '}
                {stats.configured_rtp_percent}%)
              </div>
            </div>
          </div>

          {/* Prize distribution */}
          {stats.prizes_distribution.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 font-semibold text-dark-100">
                {t('admin.wheel.statistics.prizeDistribution')}
              </h3>
              <div className="space-y-2">
                {stats.prizes_distribution.map((prize, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-dark-300">{prize.display_name}</span>
                    <span className="text-dark-100">
                      {t('admin.wheel.statistics.times', { count: prize.count })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top wins */}
          {stats.top_wins.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 font-semibold text-dark-100">
                {t('admin.wheel.statistics.topWins')}
              </h3>
              <div className="space-y-2">
                {stats.top_wins.slice(0, 5).map((win, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-dark-300">{win.username || `User #${win.user_id}`}</span>
                    <span className="text-dark-100">
                      {win.prize_display_name} ({(win.prize_value_kopeks / 100).toFixed(0)}₽)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline Prize Form Component
function InlinePrizeForm({
  prize,
  onSave,
  onCancel,
  isLoading,
}: {
  prize: WheelPrizeAdmin | null;
  onSave: (data: Partial<WheelPrizeAdmin>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<{
    prize_type: string;
    prize_value: number | '';
    display_name: string;
    emoji: string;
    color: string;
    prize_value_kopeks: number | '';
    is_active: boolean;
    manual_probability: number | null;
    promo_balance_bonus_kopeks: number | '';
    promo_subscription_days: number | '';
    promo_traffic_gb: number | '';
  }>({
    prize_type: prize?.prize_type || 'balance_bonus',
    prize_value: prize?.prize_value || 0,
    display_name: prize?.display_name || '',
    emoji: prize?.emoji || '🎁',
    color: prize?.color || '#3B82F6',
    prize_value_kopeks: prize?.prize_value_kopeks || 0,
    is_active: prize?.is_active ?? true,
    manual_probability: prize?.manual_probability || null,
    promo_balance_bonus_kopeks: prize?.promo_balance_bonus_kopeks || 0,
    promo_subscription_days: prize?.promo_subscription_days || 0,
    promo_traffic_gb: prize?.promo_traffic_gb || 0,
  });

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      prize_value: toNumber(formData.prize_value),
      prize_value_kopeks: toNumber(formData.prize_value_kopeks),
      promo_balance_bonus_kopeks: toNumber(formData.promo_balance_bonus_kopeks),
      promo_subscription_days: toNumber(formData.promo_subscription_days),
      promo_traffic_gb: toNumber(formData.promo_traffic_gb),
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${!prize ? 'card p-4' : ''}`}>
      {/* Header for new prize */}
      {!prize && (
        <div className="flex items-center justify-between border-b border-dark-700 pb-3">
          <h3 className="font-semibold text-dark-100">{t('admin.wheel.prizes.addPrize')}</h3>
          <button type="button" onClick={onCancel} className="btn-ghost p-1">
            <XMarkIcon />
          </button>
        </div>
      )}

      {/* Two-column layout for main fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Prize type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.wheel.prizes.fields.type')}
          </label>
          <select
            value={formData.prize_type}
            onChange={(e) => setFormData({ ...formData, prize_type: e.target.value })}
            className="input w-full"
          >
            {PRIZE_TYPE_KEYS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.emoji} {t(`admin.wheel.prizes.types.${type.key}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Display name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.wheel.prizes.fields.displayName')}
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            required
            maxLength={100}
            className="input w-full"
            placeholder="e.g. 7 Days Free"
          />
        </div>

        {/* Prize value */}
        {formData.prize_type !== 'nothing' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.wheel.prizes.fields.value')} (
              {formData.prize_type === 'balance_bonus'
                ? 'kopeks'
                : formData.prize_type === 'subscription_days'
                  ? 'days'
                  : 'GB'}
              )
            </label>
            <input
              type="number"
              value={formData.prize_value}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') return setFormData({ ...formData, prize_value: '' });
                const num = parseInt(val);
                if (!isNaN(num)) setFormData({ ...formData, prize_value: num });
              }}
              min={0}
              className="input w-full"
            />
          </div>
        )}

        {/* Prize value in kopeks (for RTP calculation) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.wheel.prizes.fields.valueKopeks')}
          </label>
          <input
            type="number"
            value={formData.prize_value_kopeks}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') return setFormData({ ...formData, prize_value_kopeks: '' });
              const num = parseInt(val);
              if (!isNaN(num)) setFormData({ ...formData, prize_value_kopeks: num });
            }}
            min={0}
            className="input w-full"
          />
          <p className="mt-1 text-xs text-dark-500">
            = {(toNumber(formData.prize_value_kopeks) / 100).toFixed(2)} RUB
          </p>
        </div>

        {/* Emoji */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.wheel.prizes.fields.emoji')}
          </label>
          <input
            type="text"
            value={formData.emoji}
            onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
            maxLength={10}
            className="input w-full text-center text-2xl"
          />
        </div>

        {/* Color */}
        <ColorPicker
          label={t('admin.wheel.prizes.fields.color')}
          value={formData.color}
          onChange={(color) => setFormData({ ...formData, color })}
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`is_active_${prize?.id || 'new'}`}
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded border-dark-600"
        />
        <label htmlFor={`is_active_${prize?.id || 'new'}`} className="text-sm text-dark-300">
          {t('admin.wheel.prizes.fields.active')}
        </label>
      </div>

      {/* Promocode settings */}
      {formData.prize_type === 'promocode' && (
        <div className="space-y-3 rounded-lg bg-dark-700/50 p-3">
          <h4 className="font-medium text-dark-200">{t('admin.wheel.prizes.promo.title')}</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.wheel.prizes.promo.balanceBonus')}
              </label>
              <input
                type="number"
                value={formData.promo_balance_bonus_kopeks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    promo_balance_bonus_kopeks:
                      e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.wheel.prizes.promo.subscriptionDays')}
              </label>
              <input
                type="number"
                value={formData.promo_subscription_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    promo_subscription_days:
                      e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                className="input w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2 border-t border-dark-700 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost flex items-center gap-1 px-3 py-1.5"
          disabled={isLoading}
        >
          <XMarkIcon />
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="btn-primary flex items-center gap-1 px-3 py-1.5"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CheckIcon className="h-5 w-5" />
          )}
          {prize ? t('common.save') : t('common.confirm')}
        </button>
      </div>
    </form>
  );
}
