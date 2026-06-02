import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { newsApi } from '../api/news';
import { AdminBackButton } from '../components/admin';
import { Toggle } from '../components/admin/Toggle';
import { useHapticFeedback } from '../platform/hooks/useHaptic';
import { useDestructiveConfirm } from '../platform/hooks/useNativeDialog';
import type { NewsListItem } from '../types/news';
import {
  PlusIcon,
  RefreshIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  NewsIcon,
} from '@/components/icons';

// --- Security: hex color validation to prevent CSS injection ---
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function safeColor(color: string | null | undefined, fallback = '#888888'): string {
  if (!color || !HEX_COLOR_RE.test(color)) return fallback;
  return color;
}

// memo: prevents rows from re-rendering when sibling rows or parent state change
const ArticleRow = memo(function ArticleRow({
  article,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
}: {
  article: NewsListItem;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onToggleFeatured: () => void;
}) {
  const { t } = useTranslation();
  const color = safeColor(article.category_color);

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4 transition-all hover:border-dark-600">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
              style={{
                color,
                background: `${color}15`,
              }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: color }} />
              {article.category}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                article.is_published
                  ? 'bg-success-500/20 text-success-400'
                  : 'bg-dark-500/20 text-dark-400'
              }`}
            >
              {article.is_published ? t('news.admin.published') : t('news.admin.draft')}
            </span>
            {article.is_featured && (
              <span className="rounded-full bg-warning-500/20 px-2 py-0.5 text-[10px] font-medium text-warning-400">
                {t('news.admin.featured')}
              </span>
            )}
            <span className="text-xs text-dark-500">#{article.id}</span>
          </div>

          <p className="truncate text-sm font-medium text-dark-100">{article.title}</p>

          {article.excerpt && (
            <p className="mt-1 truncate text-xs text-dark-400">{article.excerpt}</p>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-dark-500">
            <span>
              {article.published_at ? new Date(article.published_at).toLocaleDateString() : '-'}
            </span>
            <span>
              {article.read_time_minutes} {t('news.readTime')}
            </span>
            <span>
              {article.views_count} {t('news.views')}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleFeatured}
            className={`min-h-[44px] min-w-[44px] rounded-lg p-2.5 transition-colors ${
              article.is_featured
                ? 'text-warning-400 hover:bg-warning-500/10'
                : 'text-dark-500 hover:bg-dark-700 hover:text-dark-300'
            }`}
            title={t('news.admin.featured')}
            aria-label={t('news.admin.featured')}
          >
            <StarIcon className="h-4 w-4" filled={article.is_featured} />
          </button>
          <Toggle
            checked={article.is_published}
            onChange={onTogglePublish}
            aria-label={t('news.admin.published')}
          />
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
            title={t('news.admin.edit')}
            aria-label={t('news.admin.edit')}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-error-500/10 hover:text-error-400"
            title={t('news.admin.delete')}
            aria-label={t('news.admin.delete')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

// Thin wrapper that provides stable per-row callbacks so ArticleRow (memo'd)
// does not re-render on every parent render due to new inline lambdas.
interface ArticleRowWrapperProps {
  article: NewsListItem;
  onNavigate: (path: string) => void;
  onDelete: (id: number) => void;
  onTogglePublish: (id: number) => void;
  onToggleFeatured: (id: number) => void;
}

const ArticleRowWrapper = memo(function ArticleRowWrapper({
  article,
  onNavigate,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
}: ArticleRowWrapperProps) {
  const handleEdit = useCallback(
    () => onNavigate(`/admin/news/${article.id}/edit`),
    [article.id, onNavigate],
  );
  const handleDelete = useCallback(() => onDelete(article.id), [article.id, onDelete]);
  const handleTogglePublish = useCallback(
    () => onTogglePublish(article.id),
    [article.id, onTogglePublish],
  );
  const handleToggleFeatured = useCallback(
    () => onToggleFeatured(article.id),
    [article.id, onToggleFeatured],
  );

  return (
    <ArticleRow
      article={article}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onTogglePublish={handleTogglePublish}
      onToggleFeatured={handleToggleFeatured}
    />
  );
});

export default function AdminNews() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const haptic = useHapticFeedback();
  const confirm = useDestructiveConfirm();

  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'news', 'list', page],
    queryFn: () => newsApi.getAdminNews({ limit, offset: page * limit }),
    staleTime: 30_000,
  });

  const articles = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const deleteMutation = useMutation({
    mutationFn: newsApi.deleteArticle,
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: newsApi.togglePublish,
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: newsApi.toggleFeatured,
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  // Stable callbacks passed to ArticleRowWrapper — reference equality is
  // required for memo to prevent unnecessary re-renders of each row.
  const handleDelete = useCallback(
    async (id: number) => {
      const confirmed = await confirm(t('news.admin.confirmDelete'));
      if (confirmed) {
        deleteMutation.mutate(id);
      }
    },
    [confirm, deleteMutation, t],
  );

  const handleTogglePublish = useCallback(
    (id: number) => {
      togglePublishMutation.mutate(id);
    },
    [togglePublishMutation],
  );

  const handleToggleFeatured = useCallback(
    (id: number) => {
      toggleFeaturedMutation.mutate(id);
    },
    [toggleFeaturedMutation],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton />
          <div>
            <h1 className="text-xl font-bold text-dark-100">{t('news.admin.title')}</h1>
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
              navigate('/admin/news/create');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-white transition-colors hover:bg-accent-600"
            aria-label={t('news.admin.create')}
          >
            <PlusIcon />
            <span className="hidden sm:inline">{t('news.admin.create')}</span>
          </button>
        </div>
      </div>

      {/* Articles list */}
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
                  <div className="h-8 w-8 rounded-lg bg-dark-700" />
                  <div className="h-8 w-14 rounded-full bg-dark-700" />
                  <div className="h-8 w-8 rounded-lg bg-dark-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          <NewsIcon className="h-6 w-6" />
          <p className="mt-2">{t('news.noNews')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <ArticleRowWrapper
              key={article.id}
              article={article}
              onNavigate={navigate}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
              onToggleFeatured={handleToggleFeatured}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="min-h-[44px] rounded-lg bg-dark-700 px-4 py-2.5 text-dark-300 hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          <span className="text-dark-400">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="min-h-[44px] rounded-lg bg-dark-700 px-4 py-2.5 text-dark-300 hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
