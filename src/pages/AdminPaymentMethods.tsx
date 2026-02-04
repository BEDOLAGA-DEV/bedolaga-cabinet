import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
import { adminPaymentMethodsApi } from '../api/adminPaymentMethods';
import type { PaymentMethodConfig } from '../types';

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
  kassa_ai: '\uD83C\uDFE6',
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
  kassa_ai: 'Kassa AI',
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  const displayName = config.display_name || config.default_display_name;
  const icon = METHOD_ICONS[config.method_id] || '\uD83D\uDCB3';

  // Build condition summary chips
  const chips: string[] = [];
  if (config.user_type_filter === 'telegram')
    chips.push(t('admin.paymentMethods.userTypeTelegram'));
  if (config.user_type_filter === 'email') chips.push(t('admin.paymentMethods.userTypeEmail'));
  if (config.first_topup_filter === 'yes') chips.push(t('admin.paymentMethods.firstTopupYes'));
  if (config.first_topup_filter === 'no') chips.push(t('admin.paymentMethods.firstTopupNo'));
  if (config.promo_group_filter_mode === 'selected' && config.allowed_promo_group_ids.length > 0) {
    chips.push(
      `${config.allowed_promo_group_ids.length} ${t('admin.paymentMethods.promoGroupsShort')}`,
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
      className={`group flex items-center gap-3 rounded-xl border p-4 ${
        isDragging
          ? 'border-accent-500/50 bg-dark-800 shadow-xl shadow-accent-500/20'
          : config.is_enabled
            ? 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
            : 'border-dark-800/50 bg-dark-900/30 opacity-60'
      }`}
    >
      {/* Drag handle */}
      {/* Drag handle - larger touch target for mobile */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab touch-none rounded-lg p-2.5 text-dark-500 hover:bg-dark-700/50 hover:text-dark-300 active:cursor-grabbing sm:p-1.5"
        title={t('admin.paymentMethods.dragToReorder')}
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
              {t('admin.paymentMethods.enabled')}
            </span>
          ) : (
            <span className="flex-shrink-0 rounded-full border border-dark-700/30 bg-dark-700/50 px-2 py-0.5 text-xs text-dark-500">
              {t('admin.paymentMethods.disabled')}
            </span>
          )}
          {!config.is_provider_configured && (
            <span className="flex-shrink-0 rounded-full border border-warning-500/20 bg-warning-500/15 px-2 py-0.5 text-xs text-warning-400">
              {t('admin.paymentMethods.notConfigured')}
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch payment methods
  const { data: fetchedMethods, isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: adminPaymentMethodsApi.getAll,
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
      setToastMessage(t('admin.paymentMethods.orderSaved'));
    },
    onError: () => {
      setToastMessage(t('common.error'));
    },
  });

  // DnD sensors - PointerSensor handles both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Telegram swipe behavior for drag-and-drop
  const {
    onDragStart: onTelegramDragStart,
    onDragEnd: onTelegramDragEnd,
    onDragCancel: onTelegramDragCancel,
  } = useTelegramDnd();

  const handleDragStart = useCallback(
    (_event: DragStartEvent) => {
      onTelegramDragStart();
    },
    [onTelegramDragStart],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      onTelegramDragEnd();
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
    },
    [onTelegramDragEnd],
  );

  const handleDragCancel = useCallback(() => {
    onTelegramDragCancel();
  }, [onTelegramDragCancel]);

  const handleSaveOrder = () => {
    saveOrderMutation.mutate(methods.map((m) => m.method_id));
  };

  const handleCloseToast = useCallback(() => setToastMessage(null), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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
          <div>
            <h1 className="text-2xl font-bold text-dark-50">{t('admin.paymentMethods.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.paymentMethods.description')}</p>
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
            {t('admin.paymentMethods.saveOrder')}
          </button>
        )}
      </div>

      {/* Drag hint */}
      <div className="flex items-center gap-2 text-sm text-dark-500">
        <GripIcon />
        {t('admin.paymentMethods.dragHint')}
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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
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
                    onClick={() => navigate(`/admin/payment-methods/${config.method_id}/edit`)}
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
            <div className="text-dark-400">{t('admin.paymentMethods.noMethods')}</div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toastMessage && <Toast message={toastMessage} onClose={handleCloseToast} />}
    </div>
  );
}
