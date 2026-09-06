import { useTranslation } from 'react-i18next';
import type { ReachabilityStatus } from '@/api/reachability';
import { formatCredits, formatKopeks } from './money';

/** Баланс bschekbot в шапке: кредиты крупно, рубли мелко; тариф — в подзаголовке страницы. */
export function BalanceBadge({ status }: { status: ReachabilityStatus }) {
  const { t } = useTranslation();
  return (
    <div className="text-right">
      <p className="text-xs text-dark-400">{t('admin.reachability.status.balance')}</p>
      <p className="text-base font-semibold tabular-nums text-dark-50">
        {formatCredits(status.balance_kopeks)}
      </p>
      {status.balance_kopeks !== null && (
        <p className="text-xs text-dark-400">≈ {formatKopeks(status.balance_kopeks)}</p>
      )}
    </div>
  );
}
