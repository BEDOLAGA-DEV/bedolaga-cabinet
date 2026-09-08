import type { TFunction } from 'i18next';

/**
 * Почему докупить или уменьшить устройства нельзя.
 *
 * Сервер шлёт машинный `reason_code`, текст берётся из локали. Поле `reason` —
 * готовая фраза на языке автора кода — остаётся запасным вариантом для кода,
 * которого этот кабинет ещё не знает, и для старого сервера, где кода нет вовсе.
 */
export interface DeviceReasonInfo {
  available?: boolean;
  reason?: string | null;
  reason_code?: string | null;
  max_device_limit?: number | null;
  can_add?: number | null;
  min_device_limit?: number | null;
}

const OPTIONS = 'subscription.additionalOptions';

const REASON_KEYS: Record<string, (info: DeviceReasonInfo) => [string, Record<string, number>?]> = {
  no_subscription: () => [`${OPTIONS}.reasons.noSubscription`],
  no_active_subscription: () => [`${OPTIONS}.reasons.noActiveSubscription`],
  devices_unavailable: () => [`${OPTIONS}.devicesUnavailable`],
  max_devices_reached: (info) => [
    `${OPTIONS}.reasons.maxDevicesReached`,
    { count: info.max_device_limit ?? 0 },
  ],
  can_add_limited: (info) => [`${OPTIONS}.reasons.canAddLimited`, { count: info.can_add ?? 0 }],
  trial: () => [`${OPTIONS}.reasons.trialNotAllowed`],
  at_minimum: () => [`${OPTIONS}.alreadyAtMinDeviceLimit`],
};

export function deviceUnavailableText(
  t: TFunction,
  info: DeviceReasonInfo | undefined,
  fallbackKey: string,
): string {
  const resolve = info?.reason_code ? REASON_KEYS[info.reason_code] : undefined;
  if (resolve) {
    const [key, params] = resolve(info as DeviceReasonInfo);
    return params ? t(key, params) : t(key);
  }
  return info?.reason || t(fallbackKey);
}
