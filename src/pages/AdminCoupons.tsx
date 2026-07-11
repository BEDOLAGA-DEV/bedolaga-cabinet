import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { couponsApi, CouponBatch } from '../api/coupons';
import { usePlatform } from '../platform/hooks/usePlatform';
import { formatPrice, formatShortDate } from '../utils/format';
import {
  BackIcon,
  PlusIcon,
  CheckCircleIcon,
  ChartBarIcon,
  TagIcon,
  TicketIcon,
} from '@/components/icons';
import { StatCard } from '../components/stats';

const PAGE_SIZE = 50;

export default function AdminCoupons() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [offset, setOffset] = useState(0);

  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['admin-coupon-batches', offset],
    queryFn: () => couponsApi.getBatches({ limit: PAGE_SIZE, offset }),
  });

  const batches = batchesData?.items || [];
  const total = batchesData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

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
            <h1 className="text-xl font-bold text-dark-100">{t('admin.coupons.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.coupons.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/coupons/create')}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
        >
          <PlusIcon />
          {t('admin.coupons.addBatch')}
        </button>
      </div>

      {/* Stats Overview — the Active/Redeemed/Revoked cards sum only the loaded
          page, so show them only when the whole set fits one page; otherwise
          they would contradict the global "Batches" total. */}
      {batches.length > 0 && total <= PAGE_SIZE && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('admin.coupons.stats.batches')}
            value={total}
            icon={<TagIcon className="h-5 w-5" />}
            tone="neutral"
          />
          <StatCard
            label={t('admin.coupons.stats.active')}
            value={batches.reduce((sum, b) => sum + b.active_count, 0)}
            icon={<TicketIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.coupons.stats.redeemed')}
            value={batches.reduce((sum, b) => sum + b.redeemed_count, 0)}
            icon={<CheckCircleIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.coupons.stats.revoked')}
            value={batches.reduce((sum, b) => sum + b.revoked_count, 0)}
            icon={<ChartBarIcon className="h-5 w-5" />}
            tone="warning"
          />
        </div>
      )}

      {/* Batches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : batches.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.coupons.noBatches')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch: CouponBatch) => (
            <button
              key={batch.id}
              onClick={() => navigate(`/admin/coupons/${batch.id}`)}
              className={`w-full rounded-xl border bg-dark-800 p-4 text-left transition-colors hover:border-dark-600 ${
                batch.is_revoked ? 'border-dark-700/50 opacity-60' : 'border-dark-700'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 font-medium text-dark-100">
                    <span className="text-dark-500">#{batch.id}</span>
                    <span className="truncate">{batch.name}</span>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="rounded bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
                      {batch.tariff_name || '—'} · {batch.period_days} {t('admin.coupons.days')}
                    </span>
                    {batch.is_revoked && (
                      <span className="rounded bg-error-500/20 px-2 py-0.5 text-xs text-error-400">
                        {t('admin.coupons.list.revoked')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span className="text-success-400">
                      {t('admin.coupons.stats.active')}: {batch.active_count}
                    </span>
                    <span className="text-accent-400">
                      {t('admin.coupons.stats.redeemed')}: {batch.redeemed_count}
                    </span>
                    {batch.revoked_count > 0 && (
                      <span className="text-error-400">
                        {t('admin.coupons.stats.revoked')}: {batch.revoked_count}
                      </span>
                    )}
                    {batch.wholesale_price_kopeks > 0 && (
                      <span>
                        {t('admin.coupons.list.price')}:{' '}
                        {formatPrice(batch.wholesale_price_kopeks, i18n.language)}
                      </span>
                    )}
                    {batch.valid_until && (
                      <span>
                        {t('admin.coupons.list.until')}: {formatShortDate(batch.valid_until)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-dark-500">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={offset === 0}
            className={`btn-secondary min-w-[100px] flex-1 ${offset === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {t('admin.coupons.pagination.prev')}
          </button>
          <div className="flex-1 text-center">
            {t('admin.coupons.pagination.page', { current: currentPage, total: totalPages })}
          </div>
          <button
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={currentPage >= totalPages}
            className={`btn-secondary min-w-[100px] flex-1 ${
              currentPage >= totalPages ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {t('admin.coupons.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
