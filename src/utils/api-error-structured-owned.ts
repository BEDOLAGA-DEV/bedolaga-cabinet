import type { TFunction } from 'i18next';
import { cabinetPath, type RequestContext } from './api-error-templates';

// Owned ValueError/DeviceSelectionError/PurchaseQuoteError codes, not provider codes.
const selectionKeys = new Map<string, string>([
  ['quote_changed', 'transitive007'],
  ['invalid_provider', 'transitive018'],
  ['invalid_recurrent_price', 'transitive019'],
  ['tariff_unavailable', 'transitive020'],
  ['device_selection_not_available', 'transitive021'],
  ['device_consent_required', 'transitive022'],
  ['checkout_closed', 'transitive026'],
  ['checkout_conflict', 'transitive027'],
  ['invalid_device_limit', 'transitive028'],
  ['quote_unavailable', 'transitive029'],
  ['invalid_period', 'transitive030'],
  ['quote_expired', 'transitive031'],
  ['period_out_of_range', 'transitive032'],
  ['invalid_traffic', 'transitive033'],
  ['price_out_of_range', 'transitive034'],
]);

export function localizeOwnedStructuredError(
  detail: Record<string, unknown>,
  config: RequestContext | undefined,
  t: TFunction,
): string | undefined {
  if (!config || typeof config.method !== 'string' || typeof detail.code !== 'string') return;
  const path = cabinetPath(config);
  const method = config.method.toLowerCase();
  if (!path) return;
  let key: string | undefined;
  let status: string | undefined;
  const purchaseRoute =
    method === 'post' && /^\/cabinet\/subscription\/purchase-tariff(?:\/preview)?$/.test(path);
  const recurringRoute =
    (method === 'post' &&
      /^\/cabinet\/subscription\/(?:platega|lava|cashera)-recurrent\/(?:enable|purchase)$/.test(
        path,
      )) ||
    (method === 'get' &&
      /^\/cabinet\/subscription\/(?:platega|lava|cashera)-recurrent\/purchase-preview$/.test(path));
  if (
    (purchaseRoute || recurringRoute) &&
    (detail.message === undefined || detail.message === detail.code) &&
    Object.keys(detail).every((field) => field === 'code' || field === 'message')
  ) {
    key = selectionKeys.get(detail.code);
    if (
      detail.code === 'cart_unavailable' &&
      method === 'post' &&
      path === '/cabinet/subscription/purchase-tariff'
    )
      key = 'cartUnavailable';
  }
  if (
    detail.code === 'tariff_servers_unavailable' &&
    method === 'post' &&
    [
      '/cabinet/subscription/trial',
      '/cabinet/subscription/purchase-tariff',
      '/cabinet/subscription/tariff/switch',
    ].includes(path) &&
    detail.message ===
      'Серверы этого тарифа сейчас недоступны. Выберите другой тариф или обратитесь в поддержку.'
  )
    key = 'tariffServersUnavailable';
  if (
    detail.code === 'subscription_not_active' &&
    method === 'post' &&
    ['/cabinet/subscription/tariff/switch', '/cabinet/subscription/tariff/switch/preview'].includes(
      path,
    ) &&
    typeof detail.message === 'string' &&
    !/[\r\n]/.test(detail.message)
  ) {
    const match =
      /^Subscription is not active \(status: (?<status>[^()\r\n]{1,128})\)\. Cannot switch tariff\.$/.exec(
        detail.message,
      );
    if (match?.groups) {
      key = 'subscriptionNotActive';
      status = match.groups.status;
    }
  }
  if (!key) return;
  const result = t(`apiErrors.${key}`, {
    defaultValue: '',
    ...(status === undefined ? {} : { status }),
    interpolation: { escapeValue: false, skipOnVariables: true },
  });
  return typeof result === 'string' && result ? result : undefined;
}
