import SplitTrafficPurchase from './SplitTrafficPurchase';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '@/api/subscription';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { formatTraffic } from '@/utils/formatTraffic';

interface Props {
  subscriptionId: number;
  mode: 'split' | 'split_pending';
}

// Display rounding only. Exact decimal byte strings stay in the query cache.
function displayBytes(value: string | null): string {
  if (value === null || !/^\d{1,40}$/.test(value)) return '—';
  return formatTraffic(Number(value) / 1024 ** 3);
}

export default function SplitTrafficSummary({ subscriptionId, mode }: Props) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['split-traffic-summary', subscriptionId],
    queryFn: () => subscriptionApi.getSplitTrafficSummary(subscriptionId),
    enabled: mode === 'split',
    staleTime: 15_000,
    retry: false,
  });
  const data = query.data?.subscription_id === subscriptionId ? query.data : undefined;
  const failed = query.isError || (!query.isPending && !data);
  return (
    <section className="min-h-40 min-w-0" aria-label={t('subscription.splitTraffic.title')}>
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h3 className="text-sm font-semibold text-dark-100">
          {t('subscription.splitTraffic.title')}
        </h3>
        {mode === 'split' && (
          <button
            type="button"
            className="btn-ghost min-h-11 px-3 text-sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {t(query.isFetching ? 'subscription.splitTraffic.updating' : 'common.refresh')}
          </button>
        )}
      </div>
      {mode === 'split_pending' ? (
        <p className="py-4 text-sm text-dark-300" role="status">
          {t('subscription.splitTraffic.transition')}
        </p>
      ) : query.isPending ? (
        <SkeletonGroup className="space-y-4 py-3">
          {[0, 1].map((row) => (
            <div key={row} className="flex justify-between gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </SkeletonGroup>
      ) : failed ? (
        <p className="py-4 text-sm text-dark-300" role="status">
          {t('subscription.splitTraffic.error')}
        </p>
      ) : (
        data && (
          <dl className="divide-y divide-dark-400/15 text-sm">
            {(['ordinary', 'bs'] as const).map((key) => {
              const group = data.groups[key];
              const uncertain =
                group.needs_review || group.pending_operations > 0 || group.pending_bytes !== '0';
              return (
                <div key={key} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <dt className="min-w-0 text-dark-300">
                      {t(`subscription.splitTraffic.${key}`)}
                    </dt>
                    <dd className="min-w-0 break-words text-end font-semibold tabular-nums text-dark-50">
                      {group.mode === 'unlimited'
                        ? t('subscription.splitTraffic.unlimited')
                        : group.mode === 'disabled'
                          ? t('subscription.splitTraffic.disabled')
                          : displayBytes(group.remaining_bytes)}
                    </dd>
                  </div>
                  {uncertain && (
                    <dd className="mt-2 text-xs leading-relaxed text-dark-300">
                      {t(
                        group.needs_review
                          ? 'subscription.splitTraffic.review'
                          : 'subscription.splitTraffic.pending',
                      )}
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
        )
      )}
      {data?.purchase_available === true && mode === 'split' && !failed && (
        <SplitTrafficPurchase
          key={subscriptionId}
          subscriptionId={subscriptionId}
          packages={data.purchase_packages ?? []}
        />
      )}
    </section>
  );
}
