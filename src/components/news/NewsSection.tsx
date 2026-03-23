import { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { newsApi } from '../../api/news';
import { useHapticFeedback } from '../../platform/hooks/useHaptic';
import { cn } from '../../lib/utils';
import type { NewsListItem } from '../../types/news';

// --- Security: hex color validation to prevent CSS injection ---
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function safeColor(color: string | null | undefined, fallback = '#888888'): string {
  if (!color || !HEX_COLOR_RE.test(color)) return fallback;
  return color;
}

// --- Animation variants ---
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: EASE_OUT,
    },
  }),
};

// --- Icons ---
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// --- Sub-components ---

interface CategoryBadgeProps {
  category: string;
  color: string;
  className?: string;
}

const CategoryBadge = memo(function CategoryBadge({
  category,
  color,
  className,
}: CategoryBadgeProps) {
  const c = safeColor(color);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest',
        className,
      )}
      style={{
        color: c,
        background: `${c}15`,
        border: `1px solid ${c}30`,
      }}
    >
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full"
        style={{
          background: c,
          boxShadow: `0 0 8px ${c}`,
        }}
      />
      {category}
    </span>
  );
});

interface TagBadgeProps {
  text: string;
  color: string;
}

const TagBadge = memo(function TagBadge({ text, color }: TagBadgeProps) {
  const c = safeColor(color);
  return (
    <span
      className="inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
      style={{
        color: c,
        border: `1px solid ${c}33`,
        background: `${c}11`,
      }}
    >
      {text}
    </span>
  );
});

interface FilterTabsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

const FilterTabs = memo(function FilterTabs({ categories, active, onChange }: FilterTabsProps) {
  const { t } = useTranslation();
  const haptic = useHapticFeedback();

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('news.title')}>
      {/* "All" tab — empty string means no filter */}
      <button
        role="tab"
        aria-selected={active === ''}
        onClick={() => {
          haptic.selectionChanged();
          onChange('');
        }}
        className={cn(
          'min-h-[44px] rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-300',
          active === ''
            ? 'border border-accent-400 bg-accent-400 text-dark-950'
            : 'border border-dark-700 bg-dark-800 text-dark-400 hover:border-accent-400/30 hover:text-accent-400',
        )}
      >
        {t('news.filterAll')}
      </button>
      {categories.map((cat) => {
        const isActive = active === cat;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              haptic.selectionChanged();
              onChange(cat);
            }}
            className={cn(
              'min-h-[44px] rounded-lg px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-300',
              isActive
                ? 'border border-accent-400 bg-accent-400 text-dark-950'
                : 'border border-dark-700 bg-dark-800 text-dark-400 hover:border-accent-400/30 hover:text-accent-400',
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
});

interface FeaturedCardProps {
  item: NewsListItem;
  onClick: () => void;
}

const FeaturedCard = memo(function FeaturedCard({ item, onClick }: FeaturedCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <motion.article
      custom={0}
      variants={fadeSlideUp}
      initial="hidden"
      animate="visible"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group col-span-full cursor-pointer rounded-2xl p-px transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
      style={{
        background:
          'linear-gradient(135deg, rgba(var(--color-accent-400), 0.2), rgba(var(--color-dark-900), 0.2), rgba(var(--color-accent-400), 0.2))',
      }}
      whileHover={{
        background:
          'linear-gradient(135deg, rgba(var(--color-accent-400), 0.4), rgba(var(--color-accent-500), 0.4), rgba(var(--color-accent-400), 0.4))',
      }}
      onClick={onClick}
    >
      <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[15px] bg-dark-900 p-7 sm:p-10">
        {/* Corner decoration */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-[200px] w-[200px]"
          style={{
            background:
              'radial-gradient(circle at top right, rgba(var(--color-accent-400), 0.08), transparent 70%)',
          }}
        />

        {/* Shimmer top border */}
        <div
          className="absolute -top-px left-[20%] right-[20%] h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(var(--color-accent-400), 0.4), transparent)',
            animation: 'newsShimmer 3s ease-in-out infinite',
          }}
        />

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <CategoryBadge category={item.category} color={item.category_color} />
            {item.tag && <TagBadge text={item.tag} color={item.category_color} />}
            <span className="ml-auto font-mono text-[11px] text-dark-500">
              {item.read_time_minutes} {t('news.readTime')}
            </span>
          </div>

          <h2 className="mb-3 max-w-[700px] break-words text-2xl font-extrabold leading-tight text-dark-50 transition-colors duration-300 group-hover:text-white sm:text-[28px]">
            {item.title}
          </h2>

          {item.excerpt && (
            <p className="max-w-[600px] text-[15px] leading-relaxed text-dark-400">
              {item.excerpt}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="font-mono text-xs text-dark-600">
            {item.published_at ? new Date(item.published_at).toLocaleDateString(i18n.language) : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-400 transition-all duration-300 group-hover:gap-2.5">
            {t('news.readMore')}
            <ArrowIcon />
          </span>
        </div>
      </div>
    </motion.article>
  );
});

interface NewsCardProps {
  item: NewsListItem;
  index: number;
  onClick: () => void;
}

const NewsCard = memo(function NewsCard({ item, index, onClick }: NewsCardProps) {
  const { t, i18n } = useTranslation();
  const color = safeColor(item.category_color);

  return (
    <motion.article
      custom={index + 1}
      variants={fadeSlideUp}
      initial="hidden"
      animate="visible"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-pointer rounded-[14px] p-px transition-all duration-[450ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
      style={{
        background:
          'linear-gradient(160deg, rgba(var(--color-dark-700), 0.25), rgba(var(--color-dark-900), 0.25))',
      }}
      whileHover={{
        y: -4,
        background: `linear-gradient(160deg, ${color}55, transparent 60%)`,
      }}
      onClick={onClick}
    >
      <div className="relative flex h-full min-h-[210px] flex-col justify-between overflow-hidden rounded-[13px] bg-dark-900 p-7">
        {/* Subtle corner glow on hover */}
        <div
          className="pointer-events-none absolute -bottom-5 -right-5 h-[100px] w-[100px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle, ${color}08, transparent 70%)`,
          }}
        />

        <div>
          <div className="mb-3.5 flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest"
              style={{ color }}
            >
              <span
                className="h-[5px] w-[5px] rounded-full"
                style={{
                  background: color,
                  boxShadow: `0 0 6px ${color}80`,
                }}
              />
              {item.category}
            </span>
            {item.tag && <TagBadge text={item.tag} color={color} />}
          </div>

          <h3 className="mb-2.5 break-words text-[17px] font-bold leading-snug text-dark-100 transition-colors duration-300 group-hover:text-white">
            {item.title}
          </h3>

          {item.excerpt && (
            <p className="text-[13px] leading-relaxed text-dark-400">{item.excerpt}</p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-dark-700/50 pt-3.5">
          <span className="font-mono text-[11px] text-dark-600">
            {item.published_at ? new Date(item.published_at).toLocaleDateString(i18n.language) : ''}
          </span>
          <span className="font-mono text-[11px] text-dark-500">
            {item.read_time_minutes} {t('news.readTime')}
          </span>
        </div>
      </div>
    </motion.article>
  );
});

// Thin wrapper that binds the per-item click handler without creating a new
// anonymous lambda in the parent's JSX on every render, which would defeat
// the memo on NewsCard.
interface NewsCardWrapperProps {
  item: NewsListItem;
  index: number;
  onCardClick: (slug: string) => void;
}

const NewsCardWrapper = memo(function NewsCardWrapper({
  item,
  index,
  onCardClick,
}: NewsCardWrapperProps) {
  const handleClick = useCallback(() => onCardClick(item.slug), [item.slug, onCardClick]);
  return <NewsCard item={item} index={index} onClick={handleClick} />;
});

// --- Main Component ---

const NEWS_LIMIT = 6;

export default function NewsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const haptic = useHapticFeedback();
  const [filter, setFilter] = useState<string>('');
  const [limit, setLimit] = useState(NEWS_LIMIT);

  const categoryParam = filter || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['news', 'list', categoryParam, limit],
    queryFn: () => newsApi.getNews({ category: categoryParam, limit, offset: 0 }),
    // staleTime: serve cached data for 2 min before background re-fetch.
    // gcTime: keep in cache for 10 min so navigating away and back is instant.
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const categories = data?.categories ?? [];

  // Memoized so FeaturedCard/NewsCard receive stable object references when
  // parent state unrelated to the list changes (e.g. load-more button state).
  const { featured, regular } = useMemo(
    () => ({
      featured: items.find((n) => n.is_featured),
      regular: items.filter((n) => !n.is_featured),
    }),
    [items],
  );

  const handleCardClick = useCallback(
    (slug: string) => {
      haptic.buttonPress();
      navigate(`/news/${slug}`);
    },
    [haptic, navigate],
  );

  const handleLoadMore = useCallback(() => {
    haptic.buttonPress();
    setLimit((prev) => prev + NEWS_LIMIT);
  }, [haptic]);

  const handleFilterChange = useCallback((category: string) => {
    setFilter(category);
    setLimit(NEWS_LIMIT);
  }, []);

  // Stable reference for the featured card — avoids re-rendering FeaturedCard
  // when `featured` is a new object reference but contains the same slug.
  const featuredSlug = featured?.slug;
  const handleFeaturedClick = useCallback(() => {
    if (featuredSlug) handleCardClick(featuredSlug);
  }, [featuredSlug, handleCardClick]);

  // Don't render until we know there are news items.
  // This prevents the skeleton from briefly flashing when there are no articles.
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-dark-900/50 backdrop-blur-xl">
      <div className="px-5 py-8 sm:px-6 sm:py-10">
        {/* Header */}
        <motion.div
          variants={fadeSlideUp}
          custom={0}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <div className="mb-2 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 font-mono text-sm font-extrabold text-dark-950">
              N
            </div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-dark-500">
              {t('news.title')}
            </span>
          </div>
          <h2 className="mb-5 text-2xl font-extrabold leading-tight text-dark-50 sm:text-[34px]">
            {t('news.title')}
          </h2>

          {categories.length > 0 && (
            <FilterTabs categories={categories} active={filter} onChange={handleFilterChange} />
          )}
        </motion.div>

        {/* Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featured && <FeaturedCard item={featured} onClick={handleFeaturedClick} />}
            {regular.map((item, i) => (
              <NewsCardWrapper key={item.id} item={item} index={i} onCardClick={handleCardClick} />
            ))}
          </div>
        )}

        {/* Load more */}
        {!isLoading && items.length < total && (
          <motion.div
            variants={fadeSlideUp}
            custom={6}
            initial="hidden"
            animate="visible"
            className="mt-10 text-center"
          >
            <button
              onClick={handleLoadMore}
              className="min-h-[44px] rounded-xl border border-dark-700 bg-transparent px-8 py-3 text-[13px] font-semibold tracking-wide text-dark-400 transition-all duration-300 hover:border-accent-400/30 hover:text-accent-400"
            >
              {t('news.loadMore')}
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
