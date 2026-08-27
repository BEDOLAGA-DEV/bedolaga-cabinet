import { useCallback, useState, memo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { infoPagesApi } from '../api/infoPages';
import { AdminBackButton } from '../components/admin';
import { Toggle } from '../components/admin/Toggle';
import { useHapticFeedback } from '../platform/hooks/useHaptic';
import { useDestructiveConfirm } from '../platform/hooks/useNativeDialog';
import { cn } from '../lib/utils';
import { FileTextIcon, PencilIcon, PlusIcon, RefreshIcon, TrashIcon } from '@/components/icons';
import type { InfoPageListItem, InfoPageType } from '../api/infoPages';

type FilterTab = 'all' | 'page' | 'faq';

// --- Page Row ---

const PageRow = memo(function PageRow({
  page,
  locale,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  page: InfoPageListItem;
  locale: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const { t } = useTranslation();
  const resolvedTitle = page.title[locale] || page.title['ru'] || page.title['en'] || '';

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4 transition-all hover:border-dark-600">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {page.icon && <span className="text-base">{page.icon}</span>}
            <span className="rounded-full bg-dark-700 px-2 py-0.5 font-mono text-[10px] font-medium text-dark-300">
              /{page.slug}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                page.page_type === 'faq'
                  ? 'bg-warning-500/20 text-warning-400'
                  : 'bg-accent-500/20 text-accent-400'
              }`}
            >
              {page.page_type === 'faq' ? 'FAQ' : t('admin.infoPages.typePage')}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                page.is_active
                  ? 'bg-success-500/20 text-success-400'
                  : 'bg-dark-500/20 text-dark-400'
              }`}
            >
              {page.is_active ? t('admin.infoPages.active') : t('admin.infoPages.inactive')}
            </span>
            {page.replaces_tab && (
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                {t(`admin.infoPages.replacesTabOptions.${page.replaces_tab}`)}
              </span>
            )}
            <span className="text-xs text-dark-500">#{page.id}</span>
          </div>

          <p className="truncate text-sm font-medium text-dark-100">{resolvedTitle}</p>

          <div className="mt-2 flex items-center gap-4 text-xs text-dark-500">
            <span>
              {t('admin.infoPages.fields.sortOrder')}: {page.sort_order}
            </span>
            {page.updated_at && <span>{new Date(page.updated_at).toLocaleDateString()}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Toggle
            checked={page.is_active}
            onChange={onToggleActive}
            aria-label={t('admin.infoPages.fields.isActive')}
          />
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
            title={t('admin.infoPages.edit')}
            aria-label={t('admin.infoPages.edit')}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-error-500/10 hover:text-error-400"
            title={t('admin.infoPages.delete')}
            aria-label={t('admin.infoPages.delete')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

// --- Row Wrapper (stable callbacks for memo) ---

interface PageRowWrapperProps {
  page: InfoPageListItem;
  locale: string;
  onNavigate: (path: string) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number) => void;
}

const PageRowWrapper = memo(function PageRowWrapper({
  page,
  locale,
  onNavigate,
  onDelete,
  onToggleActive,
}: PageRowWrapperProps) {
  const handleEdit = useCallback(
    () => onNavigate(`/admin/info-pages/${page.id}/edit`),
    [page.id, onNavigate],
  );
  const handleDelete = useCallback(() => onDelete(page.id), [page.id, onDelete]);
  const handleToggleActive = useCallback(() => onToggleActive(page.id), [page.id, onToggleActive]);

  return (
    <PageRow
      page={page}
      locale={locale}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onToggleActive={handleToggleActive}
    />
  );
});

export default function AdminInfoPages() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const haptic = useHapticFeedback();
  const confirm = useDestructiveConfirm();
  const currentLocale = i18n.language.split('-')[0];
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filterParam: InfoPageType | undefined = activeFilter === 'all' ? undefined : activeFilter;

  const {
    data: pages,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'info-pages', 'list', activeFilter],
    queryFn: () => infoPagesApi.getAdminPages(filterParam),
    staleTime: 30_000,
  });

  const items = pages ?? [];

  const deleteMutation = useMutation({
    mutationFn: infoPagesApi.deletePage,
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['admin', 'info-pages'] });
      queryClient.invalidateQueries({ queryKey: ['info-pages'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: infoPagesApi.toggleActive,
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['admin', 'info-pages'] });
      queryClient.invalidateQueries({ queryKey: ['info-pages'] });
    },
  });

  const handleDelete = useCallback(
    async (id: number) => {
      const confirmed = await confirm(t('admin.infoPages.confirmDelete'));
      if (confirmed) {
        deleteMutation.mutate(id);
      }
    },
    [confirm, deleteMutation, t],
  );

  const handleToggleActive = useCallback(
    (id: number) => {
      toggleActiveMutation.mutate(id);
    },
    [toggleActiveMutation],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-dark-100">{t('admin.infoPages.title')}</h1>
            {items.length > 0 && (
              <span className="rounded-full bg-dark-700 px-2 py-0.5 text-xs font-medium text-dark-300">
                {items.length}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              haptic.buttonPress();
              navigate('/admin/legal-pages');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-dark-800 px-4 py-2.5 text-dark-200 transition-colors hover:bg-dark-700"
            aria-label={t('admin.legalPages.open')}
          >
            <FileTextIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.legalPages.open')}</span>
          </button>
          <button
            onClick={() => refetch()}
            className="min-h-[44px] min-w-[44px] rounded-lg bg-dark-800 p-2.5 text-dark-400 transition-colors hover:text-dark-100"
            aria-label={t('common.refresh')}
          >
            <RefreshIcon />
          </button>
          <button
            onClick={() => {
              haptic.buttonPress();
              navigate('/admin/info-pages/create?type=faq');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-warning-500 px-4 py-2.5 text-on-warning transition-colors hover:bg-warning-400"
            aria-label={t('admin.infoPages.createFaq')}
          >
            <PlusIcon />
            <span className="hidden sm:inline">{t('admin.infoPages.createFaq')}</span>
          </button>
          <button
            onClick={() => {
              haptic.buttonPress();
              navigate('/admin/info-pages/create');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-on-accent transition-colors hover:bg-accent-600"
            aria-label={t('admin.infoPages.create')}
          >
            <PlusIcon />
            <span className="hidden sm:inline">{t('admin.infoPages.create')}</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1">
        {(['all', 'page', 'faq'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveFilter(tab)}
            className={cn(
              'min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              activeFilter === tab
                ? 'bg-accent-500 text-on-accent'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-dark-100',
            )}
          >
            {t(`admin.infoPages.filter.${tab}`)}
          </button>
        ))}
      </div>

      {/* Pages list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-dark-700 bg-dark-800/50 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-4 w-16 rounded bg-dark-700" />
                    <div className="h-4 w-12 rounded bg-dark-700" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-dark-700" />
                  <div className="h-3 w-1/2 rounded bg-dark-700" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-14 rounded-full bg-dark-700" />
                  <div className="h-8 w-8 rounded-lg bg-dark-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          <FileTextIcon className="h-6 w-6" />
          <p className="mt-2">{t('admin.infoPages.noPages')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((page) => (
            <PageRowWrapper
              key={page.id}
              page={page}
              locale={currentLocale}
              onNavigate={navigate}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
