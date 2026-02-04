import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useTelegramDnd } from '../hooks/useTelegramDnd';
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

const CogIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
    />
  </svg>
);

const GiftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const GripVerticalIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const StarIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
);

const AdjustmentsIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
    />
  </svg>
);

const TicketIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
    />
  </svg>
);

const PRIZE_TYPE_KEYS = [
  { value: 'subscription_days', key: 'subscription_days', emoji: '📅' },
  { value: 'balance_bonus', key: 'balance_bonus', emoji: '💰' },
  { value: 'traffic_gb', key: 'traffic_gb', emoji: '📊' },
  { value: 'promocode', key: 'promocode', emoji: '🎟️' },
  { value: 'nothing', key: 'nothing', emoji: '😔' },
];

type Tab = 'settings' | 'prizes' | 'statistics';

// ============ Sortable Prize Card ============

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

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [expandedPrizeId, setExpandedPrizeId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localPrizeOrder, setLocalPrizeOrder] = useState<number[] | null>(null);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<{
    is_enabled: boolean;
    spin_cost_stars: number;
    spin_cost_stars_enabled: boolean;
    spin_cost_days: number;
    spin_cost_days_enabled: boolean;
    rtp_percent: number;
    daily_spin_limit: number;
    min_subscription_days_for_day_payment: number;
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

  // Telegram DnD support
  const {
    onDragStart: onTelegramDragStart,
    onDragEnd: onTelegramDragEnd,
    onDragCancel: onTelegramDragCancel,
  } = useTelegramDnd();

  const handleDragStart = useCallback(() => {
    onTelegramDragStart();
    // Collapse expanded card to avoid collision detection issues with varying heights
    setExpandedPrizeId(null);
  }, [onTelegramDragStart]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      onTelegramDragEnd();
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
    [config, localPrizeOrder, onTelegramDragEnd],
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
            <GiftIcon />
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
            <ChartIcon />
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
                <label className="mb-1 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.costInStars')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settingsForm?.spin_cost_stars ?? config.spin_cost_stars}
                    onChange={(e) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, spin_cost_stars: parseInt(e.target.value) || 1 } : null,
                      )
                    }
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
                <label className="mb-1 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.costInDays')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settingsForm?.spin_cost_days ?? config.spin_cost_days}
                    onChange={(e) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, spin_cost_days: parseInt(e.target.value) || 1 } : null,
                      )
                    }
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
                <label className="mb-1 block text-sm font-medium text-dark-300">
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
                <label className="mb-1 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.dailyLimit')}
                </label>
                <input
                  type="number"
                  value={settingsForm?.daily_spin_limit ?? config.daily_spin_limit}
                  onChange={(e) =>
                    setSettingsForm((prev) =>
                      prev ? { ...prev, daily_spin_limit: parseInt(e.target.value) || 0 } : null,
                    )
                  }
                  min={0}
                  max={100}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-dark-300">
                  {t('admin.wheel.settings.minSubDays')}
                </label>
                <input
                  type="number"
                  value={
                    settingsForm?.min_subscription_days_for_day_payment ??
                    config.min_subscription_days_for_day_payment
                  }
                  onChange={(e) =>
                    setSettingsForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            min_subscription_days_for_day_payment: parseInt(e.target.value) || 1,
                          }
                        : null,
                    )
                  }
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
                <label className="mb-1 block text-sm font-medium text-dark-300">
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
                  updateConfigMutation.mutate(settingsForm);
                }}
                disabled={updateConfigMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {updateConfigMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <CheckIcon />
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
              onDragCancel={onTelegramDragCancel}
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
  const [formData, setFormData] = useState({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
          <label className="mb-1 block text-sm font-medium text-dark-300">
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
          <label className="mb-1 block text-sm font-medium text-dark-300">
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
            <label className="mb-1 block text-sm font-medium text-dark-300">
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
              onChange={(e) =>
                setFormData({ ...formData, prize_value: parseInt(e.target.value) || 0 })
              }
              min={0}
              className="input w-full"
            />
          </div>
        )}

        {/* Prize value in kopeks (for RTP calculation) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-dark-300">
            {t('admin.wheel.prizes.fields.valueKopeks')}
          </label>
          <input
            type="number"
            value={formData.prize_value_kopeks}
            onChange={(e) =>
              setFormData({ ...formData, prize_value_kopeks: parseInt(e.target.value) || 0 })
            }
            min={0}
            className="input w-full"
          />
          <p className="mt-1 text-xs text-dark-500">
            = {(formData.prize_value_kopeks / 100).toFixed(2)} RUB
          </p>
        </div>

        {/* Emoji */}
        <div>
          <label className="mb-1 block text-sm font-medium text-dark-300">
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
              <label className="mb-1 block text-sm text-dark-400">
                {t('admin.wheel.prizes.promo.balanceBonus')}
              </label>
              <input
                type="number"
                value={formData.promo_balance_bonus_kopeks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    promo_balance_bonus_kopeks: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                className="input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-dark-400">
                {t('admin.wheel.prizes.promo.subscriptionDays')}
              </label>
              <input
                type="number"
                value={formData.promo_subscription_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    promo_subscription_days: parseInt(e.target.value) || 0,
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
            <CheckIcon />
          )}
          {prize ? t('common.save') : t('common.confirm')}
        </button>
      </div>
    </form>
  );
}
