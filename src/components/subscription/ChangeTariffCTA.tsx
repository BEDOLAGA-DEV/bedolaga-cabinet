import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowsLeftRightIcon, ChevronRightIcon } from '@/components/icons';
import type { Subscription } from '../../types';
import { needsTariff, tariffSelectionPath } from '../../utils/legacySubscription';

/**
 * Можно ли сменить тариф этой подписки с пересчётом остатка.
 *
 * Только мультитариф: в одиночном режиме смена уже живёт на витрине тарифов,
 * куда ведёт «Продлить», а в мультитарифе витрина без подписки — это покупка
 * ещё одной. Триал не меняют, а покупают; истёкшую продлевают; старую подписку
 * без тарифа переводят на тариф своим сценарием.
 */
export function canChangeTariff(
  subscription: Subscription | null,
  isMultiTariff: boolean,
): boolean {
  return Boolean(
    isMultiTariff &&
      subscription?.tariff_id &&
      !subscription.is_trial &&
      (subscription.is_active || subscription.is_limited) &&
      !needsTariff(subscription),
  );
}

interface ChangeTariffCTAProps {
  subscription: Subscription | null;
  isMultiTariff: boolean;
}

/** «Сменить тариф»: витрина, привязанная к этой подписке, где тарифы меняются, а не докупаются. */
export default function ChangeTariffCTA({ subscription, isMultiTariff }: ChangeTariffCTAProps) {
  const { t } = useTranslation();

  if (!subscription || !canChangeTariff(subscription, isMultiTariff)) return null;

  return (
    <Link to={tariffSelectionPath(subscription.id)} className="group block">
      <div className="flex items-center justify-between rounded-2xl border border-dark-700/60 px-5 py-4 transition-colors duration-300 hover:border-accent-500/40">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(var(--color-accent-400), 0.12)',
              color: 'rgb(var(--color-accent-400))',
            }}
          >
            <ArrowsLeftRightIcon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-dark-50">
              {t('subscription.cta.changeTariff')}
            </div>
            <div className="text-[12px] text-dark-400">
              {t('subscription.cta.changeTariffHint')}
            </div>
          </div>
        </div>
        <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-dark-400 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
