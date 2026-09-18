import type { Subscription } from '@/types';

/**
 * Старая подписка: платная, без тарифа, а оператор уже на тарифах (куплена в
 * классике, потом включили тарифы). Продлить её нельзя и автоплатёж для неё не
 * работает — единственный путь: витрина тарифов, где выбранный тариф надевается
 * на неё же (та же ссылка у человека). Признак присылает бот, кабинет по режиму
 * продаж не гадает.
 */
export function needsTariff(
  subscription: Pick<Subscription, 'requires_tariff_selection'> | null | undefined,
): boolean {
  return subscription?.requires_tariff_selection === true;
}

/** Витрина тарифов для этой подписки: покупка переводит на тариф именно её. */
export function tariffSelectionPath(subscriptionId: number): string {
  return `/subscription/purchase?subscriptionId=${subscriptionId}`;
}

/** Заголовок карточки: у старой подписки честно «без тарифа», а не «текущий тариф». */
export function planTitle(
  subscription: Pick<Subscription, 'tariff_name' | 'requires_tariff_selection'>,
  t: (key: string) => string,
): string {
  if (needsTariff(subscription)) return t('subscription.legacy.noTariff');
  return subscription.tariff_name || t('subscription.currentPlan');
}

/**
 * Блок «Дополнительные опции» (докупка устройств и трафика): живой платной
 * подписке с устройствами. Старой подписке — нет: докупки считались бы по
 * классическим ценам, а её единственный путь — перейти на тариф.
 */
export function showsAddonOptions(
  subscription: Pick<
    Subscription,
    'is_active' | 'is_limited' | 'is_trial' | 'device_limit' | 'requires_tariff_selection'
  >,
): boolean {
  return (
    (subscription.is_active || subscription.is_limited) &&
    !subscription.is_trial &&
    subscription.device_limit !== 0 &&
    !needsTariff(subscription)
  );
}

/** Тумблер автоплатежа: не у пробных, не у суточных и не у старых подписок. */
export function showsAutopayToggle(
  subscription: Pick<Subscription, 'is_trial' | 'is_daily' | 'requires_tariff_selection'>,
): boolean {
  return !subscription.is_trial && !subscription.is_daily && !needsTariff(subscription);
}
