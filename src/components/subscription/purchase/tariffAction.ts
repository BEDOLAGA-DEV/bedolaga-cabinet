import type { PurchaseOptions, Subscription, Tariff } from '../../../types';
import { needsTariff } from '@/utils/legacySubscription';

/**
 * Что делает нажатие на тариф.
 *
 * Решение вынесено из разметки, потому что видов витрины стало два (обычный и
 * простой), а ветвление здесь платёжное: «продлить», «перейти на тариф»,
 * «сменить тариф» и «купить» уводят в разные сценарии и списывают разные
 * суммы. Разойдись эти два списка в одном условии — и часть людей заплатит не
 * за то, что выбрала.
 */
export type TariffActionKind =
  /** Текущий посуточный тариф: продлевать нечего, списание идёт само. */
  | 'current-daily'
  /** Текущий тариф: продлеваем его же. */
  | 'extend'
  /** Старая подписка без тарифа: тариф надевается на неё. */
  | 'moveToTariff'
  /** Смена тарифа с пересчётом остатка. */
  | 'switch'
  /** Обычная покупка. */
  | 'purchase';

export interface TariffActionInput {
  tariff: Pick<Tariff, 'id' | 'is_current'>;
  subscription: Subscription | null;
  purchaseOptions: PurchaseOptions | undefined;
  isTariffsMode: boolean;
  isMultiTariff: boolean;
}

function flag(purchaseOptions: PurchaseOptions | undefined, key: string): boolean {
  return Boolean(
    purchaseOptions && key in purchaseOptions && (purchaseOptions as never)[key] === true,
  );
}

export function tariffAction({
  tariff,
  subscription,
  purchaseOptions,
  isTariffsMode,
  isMultiTariff,
}: TariffActionInput): TariffActionKind {
  const isCurrent = Boolean(tariff.is_current) || tariff.id === subscription?.tariff_id;

  if (isCurrent) {
    return subscription?.is_daily ? 'current-daily' : 'extend';
  }

  if (needsTariff(subscription)) {
    return 'moveToTariff';
  }

  const expired = isTariffsMode && flag(purchaseOptions, 'subscription_is_expired');
  // Бесплатный (0 ₽) исходный тариф: бэкенд запрещает пересчёт при смене
  // (free_tariff_cannot_switch), поэтому ведём обычной покупкой.
  const onFreeTariff = isTariffsMode && flag(purchaseOptions, 'subscription_on_free_tariff');

  const canSwitch =
    !isMultiTariff &&
    Boolean(subscription?.tariff_id) &&
    !subscription?.is_trial &&
    !expired &&
    !onFreeTariff &&
    Boolean(subscription?.is_active || subscription?.is_limited);

  return canSwitch ? 'switch' : 'purchase';
}
