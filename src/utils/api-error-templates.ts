import type { TFunction } from 'i18next';
import { API_ERROR_TEMPLATE_RULES } from './api-error-template-rules';

export type RequestContext = { url?: unknown; baseURL?: unknown; method?: unknown };

/** Only cabinet routes from the request that produced this error are eligible. */
export function cabinetPath(config: RequestContext): string | undefined {
  if (typeof config.url !== 'string' || !config.url || config.url.length > 8192) return;
  const raw = config.url;
  if (/[\\\r\n]/.test(raw) || raw.startsWith('//')) return;
  let path: string;
  if (/^[a-z][a-z\d+.-]*:/i.test(raw)) {
    // An absolute provider URL cannot borrow a cabinet-shaped pathname.
    if (typeof config.baseURL !== 'string' || !/^https?:\/\//i.test(config.baseURL)) return;
    try {
      const url = new URL(raw);
      const base = new URL(config.baseURL);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin) return;
      path = url.pathname;
    } catch {
      return;
    }
  } else {
    path = `/${raw.split(/[?#]/, 1)[0].replace(/^\/+/, '')}`;
    if (!path.startsWith('/cabinet/') && !path.startsWith('/api/cabinet/')) {
      if (typeof config.baseURL !== 'string') return;
      let basePath = config.baseURL;
      if (/^https?:\/\//i.test(basePath)) {
        try {
          basePath = new URL(basePath).pathname;
        } catch {
          return;
        }
      }
      if (
        basePath.replace(/\/$/, '') !== '/api/cabinet' &&
        basePath.replace(/\/$/, '') !== '/cabinet'
      )
        return;
      path = `${basePath.replace(/\/$/, '')}${path}`;
    }
  }
  if (/(?:^|\/)\.{1,2}(?:\/|$)/.test(path) || /%2f|%5c|%2e/i.test(path)) return;
  if (path.startsWith('/api/cabinet/')) path = path.slice(4);
  return path.startsWith('/cabinet/') ? path : undefined;
}

export function localizeApiErrorTemplate(
  raw: string,
  config: RequestContext | undefined,
  t: TFunction,
): string | undefined {
  if (!config || typeof config.method !== 'string' || raw.length > 8192 || /[\r\n]/.test(raw))
    return;
  const path = cabinetPath(config);
  if (!path) return;
  const method = config.method.toLowerCase();
  for (const rule of API_ERROR_TEMPLATE_RULES) {
    if (!rule.routes.some((route) => route.method === method && route.path.test(path))) continue;
    const match = rule.pattern.exec(raw);
    if (!match?.groups) continue;
    const result = t(`apiErrors.${rule.key}`, {
      ...match.groups,
      defaultValue: '',
      interpolation: { escapeValue: false, skipOnVariables: true },
    });
    return typeof result === 'string' && result ? result : undefined;
  }
}

/** Three existing monetary payload shapes; no arithmetic or classification. */
export function localizeApiMonetaryError(
  detail: Record<string, unknown>,
  config: RequestContext | undefined,
  t: TFunction,
): string | undefined {
  if (!config || typeof config.method !== 'string' || config.method.toLowerCase() !== 'post')
    return;
  const path = cabinetPath(config);
  if (!path) return;
  const integer = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value);
  let key: string | undefined;
  let amount: string | undefined;
  if (detail.code === 'insufficient_funds') {
    if (
      [
        '/cabinet/subscription/purchase-tariff',
        '/cabinet/subscription/renew',
        '/cabinet/subscription/traffic',
        '/cabinet/subscription/tariff/switch',
      ].includes(path) &&
      integer(detail.missing_amount) &&
      detail.missing_amount >= 0 &&
      typeof detail.message === 'string'
    ) {
      // Exact settings.format_price(..., round_kopeks=False) spelling, kept verbatim.
      const match =
        /^(?:Недостаточно средств\. Не хватает |Insufficient funds\. Missing )(?<amount>[0-9]+(?:\.[0-9]{1,2})? ₽)$/.exec(
          detail.message,
        );
      if (match && !/[\r\n]/.test(detail.message)) {
        key = 'moneyMissing';
        amount = match.groups?.amount;
      }
    } else if (
      ['/cabinet/subscription/devices', '/cabinet/subscription/devices/purchase'].includes(path) &&
      detail.error === 'Insufficient balance' &&
      detail.message === undefined &&
      integer(detail.required_kopeks) &&
      detail.required_kopeks >= 0 &&
      integer(detail.current_kopeks) &&
      integer(detail.missing_kopeks) &&
      detail.missing_kopeks >= 0
    ) {
      key = 'moneyDevices';
    }
  } else if (
    detail.code === 'insufficient_balance' &&
    path === '/cabinet/subscription/pause' &&
    integer(detail.required) &&
    detail.required >= 0 &&
    integer(detail.balance)
  ) {
    if (detail.message === 'Insufficient balance to resume daily subscription')
      key = 'moneyDailyResume';
    if (detail.message === 'Balance deduction failed') key = 'moneyDeductionFailed';
  }
  if (!key) return;
  const result = t(`apiErrors.${key}`, {
    defaultValue: '',
    ...(amount === undefined ? {} : { amount }),
    interpolation: { escapeValue: false, skipOnVariables: true },
  });
  return typeof result === 'string' && result ? result : undefined;
}
