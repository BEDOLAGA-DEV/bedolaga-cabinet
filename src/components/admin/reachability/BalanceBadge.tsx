import { useTranslation } from 'react-i18next';
import type { ReachabilityStatus } from '@/api/reachability';
import { formatShortDate } from '@/utils/format';
import { formatCredits, formatKopeks } from './money';

/** Баланс bschekbot в шапке: кредиты крупно, рубли и тариф мелко. */
export function BalanceBadge({ status }: { status: ReachabilityStatus }) {
  const { t } = useTranslation();
  return (
    <div className="text-right">
      <p className="text-xs text-dark-400">{t('admin.reachability.status.balance')}</p>
      <p className="text-base font-semibold tabular-nums text-dark-50">
        {formatCredits(status.balance_kopeks)}
      </p>
      <p className="text-xs text-dark-400">
        {status.balance_kopeks !== null && `≈ ${formatKopeks(status.balance_kopeks)}`}
        {status.tier && ` · ${status.tier}`}
        {status.tier_expires_at && ` ${formatShortDate(status.tier_expires_at)}`}
      </p>
    </div>
  );
}
