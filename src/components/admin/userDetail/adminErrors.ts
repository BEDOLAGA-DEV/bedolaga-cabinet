type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Ответы админских ручек бота про пользователей — английские строки для разработчика
 * («Insufficient balance. Current: 5000, requested: 10000»). Админу кабинета их
 * показывать нельзя: известные переводим словами, русские тексты бота оставляем,
 * незнакомые английские заменяем общей фразой — техничка уходит только в консоль.
 */

const NS = 'admin.users.errors';

interface Rule {
  pattern: RegExp;
  key: string;
  /** Параметры перевода из совпадения: копейки → рубли и т.п. */
  params?: (match: RegExpMatchArray, money: (kopeks: number) => string) => Record<string, string>;
}

const RULES: Rule[] = [
  {
    pattern: /^Insufficient balance\. Current: (-?\d+), requested: (\d+)/,
    key: 'insufficientBalance',
    params: (match, money) => ({
      current: money(Number(match[1])),
      requested: money(Number(match[2])),
    }),
  },
  {
    pattern: /already has an active subscription for (this|the target) tariff/i,
    key: 'tariffTaken',
  },
  { pattern: /^Cannot activate: user already has an active subscription/, key: 'tariffTaken' },
  { pattern: /already has a subscription\. Enable multi-tariff/, key: 'singleTariff' },
  { pattern: /Open grace access|Temporary renewal access is still active/, key: 'graceActive' },
  { pattern: /^Days must be a positive integer/, key: 'badDays' },
  {
    pattern: /cannot be their own referrer|cannot assign themselves as referrer/,
    key: 'selfReferrer',
  },
  { pattern: /^Circular referral/, key: 'circularReferral' },
  { pattern: /does not have a referrer/, key: 'noReferrer' },
  { pattern: /is not a referral of the specified referrer/, key: 'notReferral' },
  { pattern: /cannot modify their own referral commission/, key: 'ownCommission' },
  { pattern: /listed in ADMIN_IDS/, key: 'adminProtected' },
  {
    pattern: /no panel account|not linked to the panel|not found in panel|Remnawave identifier/,
    key: 'notInPanel',
  },
  { pattern: /^Sync error/, key: 'panelUnreachable' },
  { pattern: /^Subscription reset failed/, key: 'resetNotFinished' },
  { pattern: /^User has no subscription/, key: 'noSubscription' },
  { pattern: /^No devices to reset/, key: 'noDevices' },
  { pattern: /^Device not found/, key: 'deviceNotFound' },
  { pattern: /^Traffic purchase not found/, key: 'packageNotFound' },
  { pattern: /^Tariff not found/, key: 'tariffNotFound' },
  { pattern: /^Promo group not found/, key: 'promoGroupNotFound' },
  { pattern: /^Subscription not found/, key: 'subscriptionNotFound' },
  { pattern: /^(User|Referrer user|Referral user) not found/, key: 'userNotFound' },
];

const CYRILLIC = /[а-яё]/i;

export function adminErrorText(
  detail: string | null | undefined,
  t: Translate,
  money: (kopeks: number) => string,
): string {
  const fallback = t(`${NS}.generic`);
  const text = detail?.trim();
  if (!text) return fallback;
  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match) return t(`${NS}.${rule.key}`, rule.params?.(match, money));
  }
  // Русский текст бот писал для людей — его можно показать как есть.
  if (CYRILLIC.test(text)) return text;
  console.warn('[admin] untranslated server error:', text);
  return fallback;
}
