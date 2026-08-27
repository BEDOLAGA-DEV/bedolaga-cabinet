import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { METHOD_LABELS } from '../../constants/paymentMethods';
import { SALES_STATS } from '../../constants/salesStats';
import { CardIcon, PercentIcon, WarningIcon } from '../../components/icons';
import PaymentMethodIcon from '../PaymentMethodIcon';
import { StatCard } from '../stats';

interface PaymentHealthTabProps {
  params: SalesStatsParams;
}

/** Green when healthy, amber when shaky, red when most attempts fail. */
function rateColor(rate: number): string {
  if (rate >= 90) return 'text-success-400';
  if (rate >= 70) return 'text-warning-400';
  return 'text-error-400';
}

function barColor(rate: number): string {
  if (rate >= 90) return 'bg-success-500';
  if (rate >= 70) return 'bg-warning-500';
  return 'bg-error-500';
}

export function PaymentHealthTab({ params }: PaymentHealthTabProps) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-stats', 'payment-health', params],
    queryFn: () => salesStatsApi.getPaymentHealth(params),
    staleTime: SALES_STATS.STALE_TIME,
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-dark-800/30" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <div className="py-8 text-center text-error-400">{t('admin.salesStats.loadError')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t('admin.salesStats.payments.successRate')}
          value={`${data.success_rate}%`}
          icon={<PercentIcon className="h-5 w-5" />}
          tone={data.success_rate >= 90 ? 'success' : data.success_rate >= 70 ? 'warning' : 'error'}
        />
        <StatCard
          label={t('admin.salesStats.payments.attempts')}
          value={data.total_attempts}
          icon={<CardIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.salesStats.payments.failedPurchases')}
          value={data.failed_purchases}
          icon={<WarningIcon className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="bento-card">
        <h4 className="mb-3 text-sm font-semibold text-dark-200">
          {t('admin.salesStats.payments.byGateway')}
        </h4>
        {data.by_gateway.length === 0 ? (
          <div className="py-6 text-center text-sm text-dark-400">{t('common.noData')}</div>
        ) : (
          <div className="space-y-3">
            {data.by_gateway.map((g) => (
              <div key={g.method} className="flex items-center gap-3">
                <PaymentMethodIcon method={g.method} className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm text-dark-200">
                      {METHOD_LABELS[g.method] || g.method}
                    </span>
                    <span className="shrink-0 text-xs text-dark-500">
                      {g.paid}/{g.total}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dark-700/60">
                      <div
                        className={`h-full rounded-full ${barColor(g.success_rate)}`}
                        style={{ width: `${g.success_rate}%` }}
                      />
                    </div>
                    <span className={`shrink-0 text-xs font-medium ${rateColor(g.success_rate)}`}>
                      {g.success_rate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
