import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
import {
  getApiErrorCode,
  getApiErrorMessage,
  isRateLimitedError,
  isUncertainPurchaseOutcome,
} from './api-error';
import { ADMIN_ERROR_LITERAL_KEYS } from './api-error-admin-literals';
import { AUTH_ERROR_LITERAL_KEYS } from './api-error-auth-literals';
import { getLocalizedApiErrorMessage } from './api-error-display';
import { PURCHASE_ERROR_LITERAL_KEYS } from './api-error-literals';
import { SERVICE_ERROR_LITERAL_KEYS } from './api-error-service-literals';
import { USER_ERROR_LITERAL_KEYS } from './api-error-user-literals';
const resources = { ru, en, zh, fa };
const codes = [
  ['account_deleted', 'accountDeleted'],
  ['no_telegram_id', 'noTelegramId'],
  ['bot_not_configured', 'botNotConfigured'],
  ['empty_message', 'emptyMessage'],
  ['send_failed', 'messageSendFailed'],
  ['subscription_expired', 'expiredCannotSwitch'],
  ['trial_cannot_switch', 'trialCannotSwitch'],
  ['free_tariff_cannot_switch', 'freeCannotSwitch'],
] as const;
function error(detail: unknown, status = 400) {
  return Object.freeze({
    isAxiosError: true,
    response: Object.freeze({ status, data: Object.freeze({ detail }) }),
  });
}
it('has 57 service literals unique across all categories', () => {
  expect(SERVICE_ERROR_LITERAL_KEYS).toHaveLength(57);
  const entries = [
    ...SERVICE_ERROR_LITERAL_KEYS,
    ...PURCHASE_ERROR_LITERAL_KEYS,
    ...AUTH_ERROR_LITERAL_KEYS,
    ...USER_ERROR_LITERAL_KEYS,
    ...ADMIN_ERROR_LITERAL_KEYS,
  ];
  expect(new Set(entries.map(([raw]) => raw)).size).toBe(entries.length);
  expect(new Set(entries.map(([, key]) => key)).size).toBe(entries.length);
});
it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'renders finite service messages and owned codes in %s',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
      interpolation: { escapeValue: false },
    });
    for (const [raw, key] of SERVICE_ERROR_LITERAL_KEYS) {
      expect(i18n.exists(`apiErrors.${key}`)).toBe(true);
      const expected = i18n.t(`apiErrors.${key}`);
      expect(expected.trim()).not.toBe('');
      const original = error(raw, 409);
      expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(expected);
      expect(getApiErrorMessage(original, '')).toBe(raw);
      expect(original.response.data.detail).toBe(raw);
      expect(original.response.status).toBe(409);
      // Identical wording with additional provider context must remain untouched.
      expect(
        getLocalizedApiErrorMessage(error(`${raw}: external reason`), 'fallback', i18n.t),
      ).toBe(`${raw}: external reason`);
    }
    for (const [code, key] of codes) {
      expect(i18n.exists(`apiErrors.${key}`)).toBe(true);
      const detail = Object.freeze({
        code,
        message: 'Original owned message',
        use_purchase_flow: true,
        bot_username: 'example_bot',
        telegram_deep_link: 'https://t.me/example_bot?start=revive',
      });
      const original = error(detail, 403);
      expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(
        i18n.t(`apiErrors.${key}`),
      );
      expect(original.response.data.detail).toBe(detail);
      expect(getApiErrorMessage(original, '')).toBe(detail.message);
      expect(getApiErrorCode(original)).toBe(code);
      expect(getLocalizedApiErrorMessage(error({ code }), 'fallback', i18n.t)).toBe(
        i18n.t(`apiErrors.${key}`),
      );
    }
    expect(i18n.t('apiErrors.accountDeleted')).toContain('/start');
    // Generic codes, provider reasons and all monetary schemas retain their exact context.
    for (const detail of [
      { code: 'forbidden', message: 'Provider refused the request' },
      { code: 'bad_request', message: 'External validation failed' },
      { code: 'blacklisted', message: '<b>Custom operator reason</b>' },
      { code: 'maintenance', message: 'Custom maintenance notice' },
      {
        code: 'subscription_not_active',
        message: 'Subscription is not active (status: DISABLED). Cannot switch tariff.',
      },
      {
        code: 'insufficient_funds',
        message: 'Missing 12.34 RUB',
        missing_amount: 1234,
        cart_saved: true,
      },
      {
        code: 'insufficient_funds',
        message: 'Insufficient balance',
        required_kopeks: 1000,
        current_kopeks: 150,
        missing_kopeks: 850,
      },
      {
        code: 'insufficient_funds',
        message: 'Insufficient funds',
        cart_mode: 'subscription_purchase',
      },
      {
        code: 'insufficient_balance',
        message: 'Balance deduction failed',
        required: 500,
        balance: 100,
      },
    ]) {
      Object.freeze(detail);
      for (const status of [402, 409, 429, 502, 503, 504]) {
        const original = error(detail, status);
        const before = [isRateLimitedError(original), isUncertainPurchaseOutcome(original)];
        expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(detail.message);
        expect(original.response.data.detail).toBe(detail);
        expect([isRateLimitedError(original), isUncertainPurchaseOutcome(original)]).toEqual(
          before,
        );
      }
    }
  },
);
it('preserves raw fallbacks with missing translations', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', fallbackLng: false, resources: { en: { translation: {} } } });
  for (const [raw] of SERVICE_ERROR_LITERAL_KEYS)
    expect(getLocalizedApiErrorMessage(error(raw), 'fallback', i18n.t)).toBe(raw);
  for (const [code] of codes)
    expect(
      getLocalizedApiErrorMessage(error({ code, message: 'Original message' }), 'fallback', i18n.t),
    ).toBe('Original message');
});
