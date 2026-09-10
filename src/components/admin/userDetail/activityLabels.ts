import type { UserActivityItem } from '../../../api/adminUsers';

/**
 * Человеческие подписи для следа пользователя в кабинете и Mini App.
 * Сервер хранит путь экрана («/subscriptions/{id}») и действие
 * («POST /cabinet/subscription/trial»); админ должен видеть «Подписка» и
 * «Активация триала». Незнакомый путь показывается как есть — лучше сырая
 * строка, чем пропавшая запись.
 */

const NS = 'admin.users.detail.activity';

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** Точные пути экранов → ключ подписи. */
const SCREEN_EXACT: Record<string, string> = {
  '/': 'dashboard',
  '/subscription': 'subscription',
  '/subscriptions': 'subscription',
  '/subscription/{id}': 'subscription',
  '/subscriptions/{id}': 'subscription',
  '/subscription/purchase': 'purchase',
  '/subscriptions/{id}/renew': 'renew',
  '/balance': 'balance',
  '/balance/top-up': 'topUp',
  '/balance/saved-cards': 'savedCards',
  '/connect': 'connection',
  '/connection': 'connection',
  '/connection/qr': 'connection',
  '/contests': 'contests',
  '/gift': 'gift',
  '/gift/result': 'gift',
  '/info': 'info',
  '/offer': 'offer',
  '/privacy': 'privacy',
  '/polls': 'polls',
  '/profile': 'profile',
  '/profile/accounts': 'accounts',
  '/recurrent-payments': 'recurrentPayments',
  '/referral': 'referral',
  '/referral/partner/apply': 'partnerApply',
  '/referral/withdrawal/request': 'withdrawalRequest',
  '/support': 'support',
  '/wheel': 'wheel',
  '/login': 'login',
  '/tg': 'login',
  '/add': 'accounts',
  '/miniapp/subscription': 'subscription',
  '/miniapp/subscription/tariffs': 'tariffs',
  '/miniapp/subscription/purchase/options': 'purchase',
  '/miniapp/subscription/purchase/preview': 'purchase',
  '/miniapp/subscription/renewal/options': 'renew',
  '/miniapp/subscription/settings': 'subscriptionSettings',
  '/miniapp/subscription/tariff/switch/preview': 'tariffSwitch',
  '/miniapp/payments/methods': 'topUp',
  '/miniapp/payments/status': 'paymentStatus',
  '/miniapp/maintenance/status': 'maintenance',
};

/** Семейства экранов: путь начинается с префикса → ключ подписи (длинные префиксы раньше). */
const SCREEN_PREFIXES: Array<[string, string]> = [
  ['/balance/top-up/result', 'topUpResult'],
  ['/balance/top-up', 'topUp'],
  ['/buy/gift', 'gift'],
  ['/buy/success', 'buy'],
  ['/buy', 'buy'],
  ['/coupon', 'coupon'],
  ['/info', 'info'],
  ['/news', 'news'],
  ['/merge', 'merge'],
  ['/auth', 'login'],
  ['/auto-login', 'login'],
  ['/verify-email', 'verifyEmail'],
  ['/reset-password', 'resetPassword'],
];

/** Действия (метод + путь) → ключ подписи. */
const ACTIONS: Record<string, string> = {
  'POST /cabinet/subscription/trial': 'trial',
  'POST /cabinet/subscription/purchase': 'purchase',
  'POST /cabinet/subscription/purchase-tariff': 'purchaseTariff',
  'POST /cabinet/subscription/renew': 'renew',
  'POST /cabinet/subscription/traffic': 'traffic',
  'PUT /cabinet/subscription/traffic': 'traffic',
  'POST /cabinet/subscription/devices': 'devices',
  'POST /cabinet/subscription/devices/purchase': 'devicePurchase',
  'POST /cabinet/subscription/devices/reduce': 'deviceReduce',
  'DELETE /cabinet/subscription/devices': 'deviceRemove',
  'DELETE /cabinet/subscription/devices/{id}': 'deviceRemove',
  'PATCH /cabinet/subscription/devices/{id}/name': 'deviceRename',
  'POST /cabinet/subscription/countries': 'countries',
  'POST /cabinet/subscription/pause': 'pause',
  'POST /cabinet/subscription/refresh-traffic': 'refreshTraffic',
  'POST /cabinet/subscription/revoke': 'revoke',
  'POST /cabinet/subscription/tariff/switch': 'tariffSwitch',
  'PATCH /cabinet/subscription/autopay': 'autopay',
  'POST /cabinet/subscription/lava-recurrent/enable': 'recurrentEnable',
  'POST /cabinet/subscription/lava-recurrent/cancel': 'recurrentCancel',
  'POST /cabinet/subscription/lava-recurrent/purchase': 'recurrentPurchase',
  'POST /cabinet/subscription/platega-recurrent/enable': 'recurrentEnable',
  'POST /cabinet/subscription/platega-recurrent/cancel': 'recurrentCancel',
  'POST /cabinet/subscription/platega-recurrent/purchase': 'recurrentPurchase',
  'DELETE /cabinet/subscription/{id}': 'subscriptionDelete',
  'POST /cabinet/balance/topup': 'topUp',
  'POST /cabinet/promocode/activate': 'promocode',
  'POST /cabinet/promocode/deactivate-discount': 'promocodeDeactivate',
  'POST /cabinet/promo/claim': 'promoOffer',
  'POST /cabinet/tickets': 'ticket',
  'POST /cabinet/tickets/{id}/messages': 'ticketMessage',
  'POST /cabinet/auth/logout': 'logout',
  'POST /cabinet/wheel/spin': 'wheelSpin',
  'POST /miniapp/subscription/purchase': 'purchase',
  'POST /miniapp/subscription/renewal': 'renew',
  'POST /miniapp/subscription/trial': 'trial',
  'POST /miniapp/subscription/tariff/purchase': 'purchaseTariff',
  'POST /miniapp/subscription/tariff/switch': 'tariffSwitch',
  'POST /miniapp/subscription/traffic': 'traffic',
  'POST /miniapp/subscription/traffic-topup': 'traffic',
  'POST /miniapp/subscription/devices': 'devices',
  'POST /miniapp/subscription/servers': 'countries',
  'POST /miniapp/subscription/autopay': 'autopay',
  'POST /miniapp/subscription/daily/toggle-pause': 'pause',
  'POST /miniapp/devices/remove': 'deviceRemove',
  'POST /miniapp/payments/create': 'topUp',
  'POST /miniapp/promo-codes/activate': 'promocode',
  'POST /miniapp/promo-offers/{id}/claim': 'promoOffer',
};

export function screenLabelKey(path: string): string | null {
  const exact = SCREEN_EXACT[path];
  if (exact) return exact;
  const family = SCREEN_PREFIXES.find(
    ([prefix]) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return family ? family[1] : null;
}

export function actionLabelKey(buttonId: string): string | null {
  return ACTIONS[buttonId] ?? null;
}

const WEB_TYPES = new Set(['cabinet_action', 'miniapp_action']);
const MESSAGE_KINDS = new Set([
  'text',
  'photo',
  'document',
  'video',
  'video_note',
  'voice',
  'audio',
  'sticker',
  'animation',
  'contact',
  'location',
  'other',
]);

/** Подпись записи для админа: имя экрана, имя действия или исходный заголовок. */
export function humanTitle(item: UserActivityItem, t: Translate): string | null {
  if (!item.title) return item.title;
  if (item.type === 'button_click' && item.subtype === 'message') {
    return MESSAGE_KINDS.has(item.title)
      ? t(`${NS}.messageKinds.${item.title}`)
      : t(`${NS}.messageKinds.other`);
  }
  if (!WEB_TYPES.has(item.type)) return item.title;
  if (item.subtype === 'screen') {
    const key = screenLabelKey(item.title);
    return key ? t(`${NS}.screens.${key}`) : item.title;
  }
  if (item.subtype === 'click') return item.title;
  const key = actionLabelKey(item.title);
  return key ? t(`${NS}.actions.${key}`) : item.title;
}

/** Подтипы, которые сами задают заголовок записи — бейдж подтипа для них лишний. */
const HEADLINE_SUBTYPES: Record<string, string> = {
  screen: 'screen',
  click: 'click',
  message: 'message',
};

export interface ItemDescription {
  typeLabel: string;
  title: string | null;
  showSubtype: boolean;
}

/** Заголовок, подпись и нужен ли бейдж подтипа — одно место для всех веток. */
export function describeItem(item: UserActivityItem, t: Translate): ItemDescription {
  const headline = item.subtype ? HEADLINE_SUBTYPES[item.subtype] : undefined;
  const typeLabel = headline
    ? t(`${NS}.types.${headline}`)
    : t(`${NS}.types.${item.type}`, { defaultValue: '' }) || item.type;
  return { typeLabel, title: humanTitle(item, t), showSubtype: !headline && !!item.subtype };
}
