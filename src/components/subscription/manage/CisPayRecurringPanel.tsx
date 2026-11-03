import { formatCisPayCharge } from '@/utils/cispayRecurring';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '../../../api/subscription';
import { usePlatform } from '../../../platform';
import { openPaymentUrl } from '../../../utils/openPaymentUrl';
import { canCancelCisPay, isCisPayTransition } from '../../../utils/cispayRecurring';

export function CisPayRecurringPanel({
  subscriptionId,
  adminUserId,
  canManage = true,
  canSetup = false,
}: {
  subscriptionId: number;
  adminUserId?: number;
  canManage?: boolean;
  canSetup?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { platform, openLink } = usePlatform();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['cispay-recurring', subscriptionId, adminUserId],
    queryFn: () => subscriptionApi.getCisPayRecurring(subscriptionId, adminUserId),
    retry: false,
    refetchInterval: (q) =>
      q.state.data && isCisPayTransition(q.state.data.status) && q.state.dataUpdateCount < 30
        ? 10000
        : false,
  });
  const cancel = useMutation({
    mutationFn: () => subscriptionApi.cancelCisPayRecurring(subscriptionId, adminUserId),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['cispay-recurring', subscriptionId, adminUserId] }),
  });
  const info = query.data;
  if (query.isPending) return <Skeleton className="mt-3 h-24 w-full" />;
  if (query.isError)
    return (
      <div className="mt-3 space-y-2 text-sm text-dark-300">
        <p role="alert">{t('subscription.cispayRecurring.checking')}</p>
        <button type="button" className="btn-secondary" onClick={() => query.refetch()}>
          {t('subscription.cispayRecurring.refresh')}
        </button>
      </div>
    );
  if (!info || (info.status === 'none' && !canSetup)) return null;
  return (
    <section
      className="bento-card min-w-0 space-y-3 p-4"
      aria-label={t('subscription.cispayRecurring.title')}
    >
      <h3 className="font-medium text-dark-100">{t('subscription.cispayRecurring.title')}</h3>
      <p role="status" className="text-sm text-dark-300">
        {t(`subscription.cispayRecurring.state.${info.status}`, {
          defaultValue: t('subscription.cispayRecurring.checking'),
        })}
      </p>
      {info.amount_kopeks !== undefined && (
        <p className="text-sm text-dark-300">
          {t('subscription.cispayRecurring.terms', {
            amount: formatCisPayCharge(info.amount_kopeks, i18n.language),
            days: info.period_days,
          })}
        </p>
      )}
      {info.next_charge_at && (
        <p className="text-sm text-dark-400">
          {t('subscription.cispayRecurring.next', {
            date: new Date(info.next_charge_at).toLocaleString(),
          })}
        </p>
      )}
      {info.reason && (
        <p className="text-sm text-dark-400">
          {t(`subscription.cispayRecurring.reason.${info.reason}`, {
            defaultValue: t('subscription.cispayRecurring.checking'),
          })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canSetup && !canCancelCisPay(info.status) && (
          <Link
            className="btn-secondary whitespace-normal"
            to={`/subscription/purchase?subscriptionId=${subscriptionId}`}
          >
            {t('subscription.cispayRecurring.setup')}
          </Link>
        )}
        {!adminUserId && info.status === 'PENDING' && info.redirect_url && (
          <button
            type="button"
            className="btn-primary whitespace-normal"
            onClick={() => openPaymentUrl(info.redirect_url!, platform, openLink)}
          >
            {t('subscription.cispayRecurring.continue')}
          </button>
        )}
        {canManage && canCancelCisPay(info.status) && (
          <button
            type="button"
            className="btn-secondary whitespace-normal"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {cancel.isPending ? t('common.loading') : t('subscription.cispayRecurring.cancel')}
          </button>
        )}
        <button
          type="button"
          className="btn-ghost"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          {t('subscription.cispayRecurring.refresh')}
        </button>
      </div>
      {cancel.isError && (
        <p role="alert" className="text-sm text-error-400">
          {t('subscription.cispayRecurring.cancelError')}
        </p>
      )}
    </section>
  );
}
