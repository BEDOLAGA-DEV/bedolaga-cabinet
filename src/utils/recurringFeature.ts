/**
 * Признак «автооплата выключена» из опций покупки.
 *
 * Раньше кабинет узнавал об отключённой автооплате из ответа 403 на запрос её
 * состояния — то есть ценой красной строки в консоли браузера на каждую
 * подписку. Признак приезжает в опциях покупки, и спрашивать состояние стоит
 * только когда фича включена.
 *
 * Старый бэкенд признака не присылает: тогда возвращаем false («не знаем, что
 * выключено») и работаем по-прежнему — через 403.
 */

export type RecurringFeatureKey = 'platega_recurrent_enabled' | 'lava_recurrent_enabled';

export function isRecurringFeatureOff(purchaseOptions: unknown, key: RecurringFeatureKey): boolean {
  if (!purchaseOptions || typeof purchaseOptions !== 'object') return false;
  const options = purchaseOptions as Record<string, unknown>;
  if (!(key in options)) return false;
  return options[key] === false;
}
