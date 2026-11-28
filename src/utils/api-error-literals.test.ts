import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
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
import { AUTH_ERROR_LITERAL_KEYS } from './api-error-auth-literals';
import { getLocalizedApiErrorMessage } from './api-error-display';
import { PURCHASE_ERROR_LITERAL_KEYS } from './api-error-literals';

const resources = { ru, en, zh, fa };

function error(detail: unknown, status = 400) {
  return Object.freeze({
    isAxiosError: true,
    response: Object.freeze({ status, data: Object.freeze({ detail }) }),
  });
}

async function translator(language: keyof typeof resources) {
  const instance = createInstance();
  await instance.init({
    lng: language,
    fallbackLng: false,
    resources: { [language]: { translation: resources[language] } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

it('keeps unique exact purchase mappings separate from authentication mappings', () => {
  expect(PURCHASE_ERROR_LITERAL_KEYS).toHaveLength(190);
  const entries = [...PURCHASE_ERROR_LITERAL_KEYS, ...AUTH_ERROR_LITERAL_KEYS];
  expect(new Set(entries.map(([literal]) => literal)).size).toBe(entries.length);
  expect(new Set(entries.map(([, key]) => key)).size).toBe(entries.length);
});

describe.each(Object.keys(resources) as (keyof typeof resources)[])(
  'purchase API literals in %s',
  (language) => {
    it('renders all 189 entries from real resources without changing the error', async () => {
      const i18n = await translator(language);
      for (const [literal, key] of PURCHASE_ERROR_LITERAL_KEYS) {
        expect(i18n.exists(`apiErrors.${key}`), key).toBe(true);
        const expected = i18n.t(`apiErrors.${key}`);
        expect(expected.trim(), key).not.toBe('');
        expect(expected, key).not.toBe(`apiErrors.${key}`);
        const original = error(literal, 402);
        expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t), literal).toBe(expected);
        expect(original.response.data.detail).toBe(literal);
        expect(original.response.status).toBe(402);
        expect(getApiErrorMessage(original, '')).toBe(literal);
        expect(isUncertainPurchaseOutcome(original)).toBe(false);
      }
    });

    it('requires exact matches and preserves operator/provider text', async () => {
      const i18n = await translator(language);
      for (const literal of [
        'Provider: Failed to create YooKassa payment',
        'Too many Apple purchase verification attempts: 4',
        'Minimum amount is 2.00 RUB',
        'Maximum amount is 20,000.00 RUB',
        'Subscription not found: 17',
        ' Subscription not found ',
        'subscription not found',
        'Future owned or provider message',
        '__proto__',
      ]) {
        expect(getLocalizedApiErrorMessage(error(literal), 'fallback', i18n.t)).toBe(literal);
      }
      for (const code of ['maintenance', 'blacklisted', 'external_provider']) {
        const detail = Object.freeze({ code, message: 'Subscription not found', retry_after: 30 });
        const original = error(detail, 503);
        expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(detail.message);
        expect(original.response.data.detail).toBe(detail);
        expect(getApiErrorCode(original)).toBe(code);
      }
    });

    it('preserves uncertain purchase classification, amounts, codes and retry metadata', async () => {
      const i18n = await translator(language);
      for (const status of [400, 402, 409, 429, 502, 503, 504]) {
        const detail = Object.freeze({
          code: 'insufficient_funds',
          message: 'Insufficient funds',
          missing_amount: 1234,
          required_amount: 5678,
          balance: 4444,
          retry_after: 30,
          purchase_state: 'pending',
        });
        const original = error(detail, status);
        expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(
          'Insufficient funds',
        );
        expect(original.response.data.detail).toBe(detail);
        expect(getApiErrorMessage(original, '')).toBe('Insufficient funds');
        expect(getApiErrorCode(original)).toBe('insufficient_funds');
        expect(isRateLimitedError(original)).toBe(status === 429);
        expect(isUncertainPurchaseOutcome(original)).toBe([502, 503, 504].includes(status));
        const literalError = error('Failed to charge balance', status);
        getLocalizedApiErrorMessage(literalError, '', i18n.t);
        expect(isUncertainPurchaseOutcome(literalError)).toBe([502, 503, 504].includes(status));
      }
      expect(isUncertainPurchaseOutcome({ isAxiosError: true })).toBe(true);
    });

    it('retains the exact fixed monetary values and currency units', async () => {
      const i18n = await translator(language);
      for (const [literal, amount] of [
        ['Minimum amount is 1.00 RUB', '1.00 RUB'],
        ['Maximum amount is 10,000.00 RUB', '10,000.00 RUB'],
      ]) {
        expect(getLocalizedApiErrorMessage(error(literal), '', i18n.t)).toContain(amount);
      }
    });
  },
);

it('falls back to the raw literal when a locale resource is missing', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', fallbackLng: false, resources: {} });
  expect(getLocalizedApiErrorMessage(error('Failed to charge balance'), 'fallback', i18n.t)).toBe(
    'Failed to charge balance',
  );
});

it('does not present a confirmed preflight refusal as an uncertain charge', () => {
  const response = error(
    'Traffic purchase was not applied. No funds were charged. Please try again.',
    409,
  );
  expect(isUncertainPurchaseOutcome(response)).toBe(false);
});
