import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminLandingsApi, LandingListItem, resolveLocaleDisplay } from '../api/landings';
import { useNotify } from '@/platform';
import { copyToClipboard } from '../utils/clipboard';
import { getApiErrorMessage } from '../utils/api-error';
import { usePlatform } from '../platform/hooks/usePlatform';
import { cn } from '../lib/utils';
import { BackIcon, PlusIcon, TrashIcon, GripIcon } from '../components/icons/LandingIcons';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
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

// Icons (non-shared, page-specific)
const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const GiftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
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

const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const StatsChartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

// ============ Sortable Landing Card ============

interface SortableLandingCardProps {
  landing: LandingListItem;
  onEdit: () => void;
  onStats: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onCopyUrl: () => void;
  isPendingDelete?: boolean;
}

function SortableLandingCard({
  landing,
  onEdit,
  onStats,
  onDelete,
  onToggle,
  onCopyUrl,
  isPendingDelete,
}: SortableLandingCardProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: landing.id,
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
      className={cn(
        'rounded-xl border bg-dark-800 p-3 transition-colors sm:p-4',
        isDragging
          ? 'border-accent-500/50 shadow-xl shadow-accent-500/20'
          : landing.is_active
            ? 'border-dark-700'
            : 'border-dark-700/50 opacity-60',
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 flex-shrink-0 cursor-grab touch-none rounded-lg p-2 text-dark-500 hover:bg-dark-700/50 hover:text-dark-300 active:cursor-grabbing sm:mt-1 sm:p-1.5"
          title={t('admin.tariffs.dragToReorder')}
        >
          <GripIcon />
        </button>

        {/* Content + Actions wrapper */}
        <div className="min-w-0 flex-1">
          {/* Top row: title/slug + actions (desktop) */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="truncate font-medium text-dark-100">
                  {resolveLocaleDisplay(landing.title)}
                </h3>
                <span className="shrink-0 rounded bg-dark-800 px-2 py-0.5 text-xs text-dark-400">
                  {landing.slug}
                </span>
                {landing.is_active ? (
                  <span className="shrink-0 rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                    {t('admin.landings.active')}
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                    {t('admin.landings.inactive')}
                  </span>
                )}
                {landing.gift_enabled && (
                  <span className="shrink-0 rounded bg-accent-500/20 px-1.5 py-0.5 text-xs text-accent-400">
                    <GiftIcon />
                  </span>
                )}
                {landing.has_active_discount && (
                  <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-medium text-accent-400">
                    {t('admin.landings.discountActive', 'Discount')}
                  </span>
                )}
              </div>
              <div className="text-sm text-dark-400">
                <span>
                  {landing.purchase_stats.total}
                  <span className="ml-1 text-dark-600">
                    {t('admin.landings.stats.created', 'created')}
                  </span>
                  <span className="mx-1 text-dark-600">/</span>
                  <span className="text-success-400">
                    {landing.purchase_stats.paid +
                      landing.purchase_stats.delivered +
                      landing.purchase_stats.pending_activation}
                  </span>
                  <span className="ml-1 text-dark-600">
                    {t('admin.landings.stats.paid', 'paid')}
                  </span>
                </span>
              </div>
            </div>

            {/* Actions: hidden on mobile, shown on desktop */}
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <button
                onClick={onCopyUrl}
                className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                title={t('admin.landings.copyUrl')}
              >
                <CopyIcon />
              </button>
              <button
                onClick={onStats}
                className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                title={t('admin.landings.statistics')}
              >
                <StatsChartIcon />
              </button>
              <button
                onClick={onToggle}
                className={cn(
                  'rounded-lg p-2 transition-colors',
                  landing.is_active
                    ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                    : 'bg-dark-700 text-dark-400 hover:bg-dark-600',
                )}
                title={
                  landing.is_active ? t('admin.landings.inactive') : t('admin.landings.active')
                }
              >
                {landing.is_active ? <CheckIcon /> : <XIcon />}
              </button>
              <button
                onClick={onEdit}
                className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                title={t('admin.landings.edit')}
              >
                <EditIcon />
              </button>
              <button
                onClick={onDelete}
                className={cn(
                  'rounded-lg p-2 transition-colors',
                  isPendingDelete
                    ? 'bg-error-500/20 text-error-400 ring-1 ring-error-500/30'
                    : 'bg-dark-700 text-dark-300 hover:bg-error-500/20 hover:text-error-400',
                )}
                title={
                  isPendingDelete
                    ? t('admin.landings.deleteConfirm', {
                        title: resolveLocaleDisplay(landing.title),
                      })
                    : t('common.delete')
                }
              >
                {isPendingDelete ? (
                  <span className="px-1 text-xs font-medium">{t('common.delete')}?</span>
                ) : (
                  <TrashIcon />
                )}
              </button>
            </div>
          </div>

          {/* Actions: shown on mobile only */}
          <div className="mt-2 flex items-center gap-1.5 sm:hidden">
            <button
              onClick={onCopyUrl}
              className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
              title={t('admin.landings.copyUrl')}
            >
              <CopyIcon />
            </button>
            <button
              onClick={onStats}
              className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
              title={t('admin.landings.statistics')}
            >
              <StatsChartIcon />
            </button>
            <button
              onClick={onToggle}
              className={cn(
                'rounded-lg p-2 transition-colors',
                landing.is_active
                  ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                  : 'bg-dark-700 text-dark-400 hover:bg-dark-600',
              )}
              title={landing.is_active ? t('admin.landings.inactive') : t('admin.landings.active')}
            >
              {landing.is_active ? <CheckIcon /> : <XIcon />}
            </button>
            <button
              onClick={onEdit}
              className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
              title={t('admin.landings.edit')}
            >
              <EditIcon />
            </button>
            <div className="flex-1" />
            <button
              onClick={onDelete}
              className={cn(
                'rounded-lg p-2 transition-colors',
                isPendingDelete
                  ? 'bg-error-500/20 text-error-400 ring-1 ring-error-500/30'
                  : 'bg-dark-700 text-dark-300 hover:bg-error-500/20 hover:text-error-400',
              )}
              title={
                isPendingDelete
                  ? t('admin.landings.deleteConfirm', {
                      title: resolveLocaleDisplay(landing.title),
                    })
                  : t('common.delete')
              }
            >
              {isPendingDelete ? (
                <span className="px-1 text-xs font-medium">{t('common.delete')}?</span>
              ) : (
                <TrashIcon />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Main Page ============

export default function AdminLandings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const { capabilities } = usePlatform();

  const [localLandings, setLocalLandings] = useState<LandingListItem[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  // Queries
  const { data: landingsData, isLoading } = useQuery({
    queryKey: ['admin-landings'],
    queryFn: () => adminLandingsApi.list(),
    staleTime: 30_000,
  });

  // Sync fetched data to local state
  useEffect(() => {
    if (landingsData && !orderChanged) {
      setLocalLandings(landingsData);
    }
  }, [landingsData, orderChanged]);

  // Save order mutation
  const saveOrderMutation = useMutation({
    mutationFn: (landingIds: number[]) => adminLandingsApi.reorder(landingIds),
    onSuccess: () => {
      setOrderChanged(false);
      queryClient.invalidateQueries({ queryKey: ['admin-landings'] });
      notify.success(t('admin.landings.orderSaved'));
    },
    onError: (err: unknown) => {
      notify.error(getApiErrorMessage(err, t('common.error')));
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: adminLandingsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-landings'] });
      notify.success(t('admin.landings.deleted'));
    },
    onError: (err: unknown) => {
      notify.error(getApiErrorMessage(err, t('common.error')));
    },
  });

  const handleDelete = (landing: LandingListItem) => {
    if (pendingDeleteId === landing.id) {
      deleteMutation.mutate(landing.id);
      setPendingDeleteId(null);
    } else {
      setPendingDeleteId(landing.id);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = setTimeout(
        () => setPendingDeleteId((prev) => (prev === landing.id ? null : prev)),
        3000,
      );
    }
  };

  const toggleMutation = useMutation({
    mutationFn: adminLandingsApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-landings'] });
    },
    onError: (err: unknown) => {
      notify.error(getApiErrorMessage(err, t('common.error')));
    },
  });

  const handleCopyUrl = async (slug: string) => {
    const url = `${window.location.origin}/buy/${slug}`;
    try {
      await copyToClipboard(url);
      notify.success(t('admin.landings.urlCopied'));
    } catch {
      // Clipboard write failed silently
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalLandings((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === active.id);
        const newIndex = prev.findIndex((l) => l.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      setOrderChanged(true);
    }
  }, []);

  const handleSaveOrder = () => {
    saveOrderMutation.mutate(localLandings.map((l) => l.id));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.landings.title')}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {orderChanged && (
            <button
              onClick={handleSaveOrder}
              disabled={saveOrderMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-success-500 px-4 py-2 text-white transition-colors hover:bg-success-600"
            >
              {saveOrderMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <SaveIcon />
              )}
              {t('admin.landings.saveOrder')}
            </button>
          )}
          <button
            onClick={() => navigate('/admin/landings/create')}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
          >
            <PlusIcon />
            {t('admin.landings.create')}
          </button>
        </div>
      </div>

      {/* Drag hint */}
      <div className="mb-4 flex items-center gap-2 text-sm text-dark-500">
        <GripIcon />
        {t('admin.tariffs.dragToReorder')}
      </div>

      {/* Landings List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : localLandings.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('common.noData')}</p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={localLandings.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {localLandings.map((landing) => (
                <SortableLandingCard
                  key={landing.id}
                  landing={landing}
                  onEdit={() => navigate(`/admin/landings/${landing.id}/edit`)}
                  onStats={() => navigate(`/admin/landings/${landing.id}/stats`)}
                  onDelete={() => handleDelete(landing)}
                  onToggle={() => toggleMutation.mutate(landing.id)}
                  onCopyUrl={() => handleCopyUrl(landing.slug)}
                  isPendingDelete={pendingDeleteId === landing.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
