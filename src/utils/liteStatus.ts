/**
 * Состояние подписки, сведённое к одной фразе и одному действию.
 *
 * Простой экран показывает ровно одну кнопку, поэтому выбор приходится делать
 * здесь, а не раскладывать по экрану все возможные действия. Порядок проверок
 * и есть содержание: подписка бывает одновременно пробной, заканчивающейся и
 * упёршейся в трафик, и человеку надо сказать то, что требует действия раньше
 * всего.
 */

export type LiteAction = 'connect' | 'renew' | 'buy' | 'manage' | 'chooseTariff';

export interface LiteStatusInput {
  status?: string;
  is_expired?: boolean;
  is_limited?: boolean;
  is_trial?: boolean;
  is_daily_paused?: boolean;
  days_left?: number;
  end_date?: string | null;
  requires_tariff_selection?: boolean;
}

export interface LiteStatus {
  /** Хвост ключа перевода: `lite.status.<key>`. */
  key: 'none' | 'expired' | 'limited' | 'paused' | 'legacy' | 'expiring' | 'trial' | 'active';
  action: LiteAction;
  /** Дата, которую подставляет фраза; null — фраза без даты. */
  date: string | null;
}

/**
 * За сколько дней до конца экран перестаёт говорить «работает до» и начинает
 * звать продлить. Три дня — это ещё не паника, но уже тот срок, когда человек
 * успевает среагировать, а не обнаруживает отключение постфактум.
 */
export const RENEW_PROMPT_DAYS = 3;

export function liteStatus(subscription: LiteStatusInput | null | undefined): LiteStatus {
  if (!subscription) {
    return { key: 'none', action: 'buy', date: null };
  }

  const endDate = subscription.end_date ?? null;

  // Закончилась или выключена — всё остальное про неё уже неважно.
  if (subscription.is_expired || subscription.status === 'disabled') {
    return { key: 'expired', action: 'renew', date: endDate };
  }

  // Старая подписка без тарифа: продлевать нечего, человека ведём выбирать тариф.
  if (subscription.requires_tariff_selection) {
    return { key: 'legacy', action: 'chooseTariff', date: endDate };
  }

  // Пауза посуточной подписки — состояние, из которого выходят руками.
  if (subscription.is_daily_paused) {
    return { key: 'paused', action: 'manage', date: null };
  }

  // Трафик кончился: подписка жива, но не работает. Продление это не чинит,
  // поэтому ведём в управление — там и докупка трафика, и всё остальное.
  if (subscription.is_limited) {
    return { key: 'limited', action: 'manage', date: null };
  }

  const daysLeft = subscription.days_left;
  if (typeof daysLeft === 'number' && daysLeft <= RENEW_PROMPT_DAYS) {
    return { key: 'expiring', action: 'renew', date: endDate };
  }

  if (subscription.is_trial) {
    return { key: 'trial', action: 'connect', date: endDate };
  }

  return { key: 'active', action: 'connect', date: endDate };
}
