import { useTranslation } from 'react-i18next';

import { ChevronRightIcon } from '@/components/icons';
import { useCurrency } from '../../../hooks/useCurrency';
import { usePromoDiscount } from '../../../hooks/usePromoDiscount';
import type { Tariff } from '../../../types';
import { dailyPriceQuote } from './dailyPrice';
import { tariffAction } from './tariffAction';
import type { TariffPickerGridProps } from './TariffPickerGrid';

/**
 * Простой вид витрины тарифов.
 *
 * Те же данные и те же обработчики, что у обычной витрины, но вместо сетки
 * карточек — список: название, одна строка характеристик, цена. Решение о том,
 * что делает нажатие, берётся из общей функции tariffAction(), поэтому два
 * вида витрины не могут разойтись в платёжном сценарии.
 *
 * Цена — единственное цветное место в строке: на витрине человек сравнивает
 * именно её.
 */
export function TariffPickerLite({
  tariffs,
  subscription,
  purchaseOptions,
  isTariffsMode,
  isMultiTariff,
  onSelectTariff,
  onSwitchTariff,
}: TariffPickerGridProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();
  const { applyPromoDiscount } = usePromoDiscount();

  const formatPrice = (kopeks: number) =>
    kopeks === 0
      ? t('subscription.free', 'Бесплатно')
      : `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  /** Цена строкой: посуточная, «от» за первый период либо гибкая оплата. */
  const priceOf = (tariff: Tariff) => {
    const daily = dailyPriceQuote(tariff, applyPromoDiscount);
    if (daily) {
      return {
        text: `${formatPrice(daily.price)} ${t('subscription.tariff.perDay')}`,
        was: daily.original && daily.original > daily.price ? formatPrice(daily.original) : null,
      };
    }
    const first = tariff.periods[0];
    if (first) {
      const promo = applyPromoDiscount(first.price_kopeks || 0, first.original_price_kopeks);
      return {
        text: `${t('subscription.from')} ${formatPrice(promo.price)}`,
        was: promo.original && promo.original > promo.price ? formatPrice(promo.original) : null,
      };
    }
    return { text: t('subscription.tariff.flexiblePayment'), was: null };
  };

  const details = (tariff: Tariff) => {
    const devices =
      tariff.device_limit === 0
        ? t('lite.tariff.unlimitedDevices', 'Устройств без ограничений')
        : t('subscription.devices', { count: tariff.device_limit });
    return `${tariff.traffic_limit_label}, ${devices}`;
  };

  return (
    <div className="divide-y divide-dark-700/40">
      {tariffs.map((tariff) => {
        const action = tariffAction({
          tariff,
          subscription,
          purchaseOptions,
          isTariffsMode,
          isMultiTariff,
        });
        const price = priceOf(tariff);
        const isCurrent = action === 'extend' || action === 'current-daily';

        const body = (
          <>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[16px] font-semibold text-dark-50">
                  {tariff.name}
                </span>
                {isCurrent && (
                  <span className="shrink-0 text-[13px] text-dark-400">
                    {t('lite.tariff.current', 'сейчас')}
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate text-[14px] text-dark-400">
                {details(tariff)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-right">
                <span className="block text-[15px] font-medium tabular-nums text-accent-400">
                  {price.text}
                </span>
                {price.was && (
                  <span className="block text-[13px] tabular-nums text-dark-400 line-through">
                    {price.was}
                  </span>
                )}
              </span>
              {action !== 'current-daily' && <ChevronRightIcon className="h-4 w-4 text-dark-500" />}
            </span>
          </>
        );

        // Текущий посуточный тариф не предлагает действия: он списывается сам,
        // и кнопка здесь обещала бы то, чего не произойдёт.
        if (action === 'current-daily') {
          return (
            <div key={tariff.id} className="flex items-center justify-between gap-4 py-4">
              {body}
            </div>
          );
        }

        return (
          <button
            key={tariff.id}
            type="button"
            onClick={() =>
              action === 'switch' ? onSwitchTariff(tariff.id) : onSelectTariff(tariff)
            }
            className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-dark-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

export default TariffPickerLite;
