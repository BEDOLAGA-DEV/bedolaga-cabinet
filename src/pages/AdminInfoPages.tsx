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
import type { InfoPageListItem, InfoPageType } from '../api/infoPages';

type FilterTab = 'all' | 'page' | 'faq';

// Icons
const PlusIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const PencilIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const FileTextIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

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
            <TrashIcon />
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
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-warning-500/80 px-4 py-2.5 text-white transition-colors hover:bg-warning-500"
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
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-white transition-colors hover:bg-accent-600"
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
                ? 'bg-accent-500 text-white'
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
          <FileTextIcon />
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
