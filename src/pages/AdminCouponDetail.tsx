import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { couponsApi } from '../api/coupons';
import { usePlatform } from '../platform/hooks/usePlatform';
import { copyToClipboard } from '../utils/clipboard';
import { formatPrice, formatShortDate } from '../utils/format';
import { getApiErrorMessage } from '../utils/api-error';
import { useToast } from '../components/Toast';
import { PermissionGate } from '../components/auth/PermissionGate';
import {
  BackIcon,
  CheckIcon,
  CheckCircleIcon,
  ChartBarIcon,
  CopyIcon,
  DownloadIcon,
  TicketIcon,
} from '@/components/icons';
import { StatCard } from '../components/stats';

export default function AdminCouponDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const { showToast } = useToast();

  const batchId = Number(id);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: batch, isLoading } = useQuery({
    queryKey: ['admin-coupon-batch', batchId],
    queryFn: () => couponsApi.getBatch(batchId),
    enabled: Number.isFinite(batchId),
  });

  const hasActive = (batch?.active_count ?? 0) > 0;

  const { data: links } = useQuery({
    queryKey: ['admin-coupon-batch-links', batchId],
    queryFn: () => couponsApi.getBatchLinks(batchId),
    enabled: Number.isFinite(batchId) && hasActive,
  });

  const revokeMutation = useMutation({
    mutationFn: () => couponsApi.revokeBatch(batchId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-batch-links', batchId] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-batches'] });
      setRevokeConfirm(false);
      showToast({
        type: 'success',
        title: t('admin.coupons.revoke.success', { count: result.revoked_count }),
        message: result.batch.name,
      });
    },
    onError: (err) => {
      setRevokeConfirm(false);
      showToast({
        type: 'error',
        title: t('admin.coupons.errors.revokeFailed'),
        message: getApiErrorMessage(err, ''),
      });
    },
  });

  const handleCopyAll = () => {
    if (!links) return;
    void copyToClipboard(links.links.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!links) return;
    const blob = new Blob([links.links.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `coupons_batch_${batchId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="py-12 text-center">
        <p className="text-dark-400">{t('admin.coupons.errors.loadFailed')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/admin/coupons')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-dark-100">
            {t('admin.coupons.detail.title', { id: batch.id })} · {batch.name}
          </h1>
          <p className="text-sm text-dark-400">
            {batch.tariff_name || '—'} · {batch.period_days} {t('admin.coupons.days')}
            {batch.is_revoked && (
              <span className="ml-2 rounded bg-error-500/20 px-2 py-0.5 text-xs text-error-400">
                {t('admin.coupons.list.revoked')}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard
          label={t('admin.coupons.stats.active')}
          value={batch.active_count}
          icon={<TicketIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.coupons.stats.redeemed')}
          value={batch.redeemed_count}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.coupons.stats.revoked')}
          value={batch.revoked_count}
          icon={<ChartBarIcon className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      {/* Info card */}
      <div className="mb-6 space-y-2 rounded-xl border border-dark-700 bg-dark-800 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-dark-400">{t('admin.coupons.detail.total')}</span>
          <span className="text-dark-100">{batch.coupons_total}</span>
        </div>
        {batch.wholesale_price_kopeks > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-dark-400">{t('admin.coupons.detail.price')}</span>
            <span className="text-dark-100">
              {formatPrice(batch.wholesale_price_kopeks, i18n.language)} ·{' '}
              {t('admin.coupons.detail.priceTotal')}{' '}
              {formatPrice(batch.wholesale_price_kopeks * batch.coupons_total, i18n.language)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-dark-400">{t('admin.coupons.detail.validUntil')}</span>
          <span className="text-dark-100">
            {batch.valid_until
              ? formatShortDate(batch.valid_until)
              : t('admin.coupons.detail.perpetual')}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-dark-400">{t('admin.coupons.detail.createdAt')}</span>
          <span className="text-dark-100">{formatShortDate(batch.created_at)}</span>
        </div>
      </div>

      {/* Links */}
      {hasActive && links && (
        <div className="mb-6 rounded-xl border border-dark-700 bg-dark-800 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-dark-200">
              {t('admin.coupons.detail.linksTitle', { count: links.count })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 rounded-lg bg-dark-700 px-3 py-1.5 text-sm text-dark-200 transition-colors hover:bg-dark-600"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? t('admin.coupons.created.copied') : t('admin.coupons.created.copyAll')}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg bg-dark-700 px-3 py-1.5 text-sm text-dark-200 transition-colors hover:bg-dark-600"
              >
                <DownloadIcon />
                {t('admin.coupons.created.download')}
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={links.links.join('\n')}
            rows={Math.min(10, links.count)}
            className="input w-full resize-none font-mono text-xs"
          />
        </div>
      )}

      {/* Revoke */}
      {hasActive && (
        <PermissionGate permission="coupons:edit" fallback={null}>
          <button
            onClick={() => setRevokeConfirm(true)}
            className="w-full rounded-lg border border-error-500/30 bg-error-500/10 px-4 py-2.5 text-error-400 transition-colors hover:bg-error-500/20"
          >
            {t('admin.coupons.revoke.button', { count: batch.active_count })}
          </button>
        </PermissionGate>
      )}

      {/* Revoke confirmation */}
      {revokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/70 p-4">
          <div className="w-full max-w-sm rounded-xl bg-dark-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark-100">
              {t('admin.coupons.revoke.confirmTitle')}
            </h3>
            <p className="mb-6 text-dark-400">
              {t('admin.coupons.revoke.confirmText', { count: batch.active_count })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRevokeConfirm(false)} className="btn-secondary flex-1">
                {t('admin.coupons.revoke.cancel')}
              </button>
              <button
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                className={`flex-1 rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600 ${
                  revokeMutation.isPending ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                {t('admin.coupons.revoke.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
