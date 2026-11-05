import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
import { getApiErrorMessage, isRateLimitedError, isUncertainPurchaseOutcome } from './api-error';
import { ADMIN_ERROR_LITERAL_KEYS } from './api-error-admin-literals';
import { AUTH_ERROR_LITERAL_KEYS } from './api-error-auth-literals';
import { getLocalizedApiErrorMessage } from './api-error-display';
import { PURCHASE_ERROR_LITERAL_KEYS } from './api-error-literals';
import { USER_ERROR_LITERAL_KEYS } from './api-error-user-literals';

const resources = { ru, en, zh, fa };
function error(detail: unknown, status = 400) {
  return Object.freeze({
    isAxiosError: true,
    response: Object.freeze({ status, data: Object.freeze({ detail }) }),
  });
}

it('keeps 205 admin literals unique across all new categories', () => {
  expect(ADMIN_ERROR_LITERAL_KEYS).toHaveLength(205);
  const entries = [
    ...ADMIN_ERROR_LITERAL_KEYS,
    ...AUTH_ERROR_LITERAL_KEYS,
    ...PURCHASE_ERROR_LITERAL_KEYS,
    ...USER_ERROR_LITERAL_KEYS,
  ];
  expect(new Set(entries.map(([literal]) => literal)).size).toBe(entries.length);
  expect(new Set(entries.map(([, key]) => key)).size).toBe(entries.length);
});

it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'renders all admin literals in %s and preserves raw contracts',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
      interpolation: { escapeValue: false },
    });
    for (const [literal, key] of ADMIN_ERROR_LITERAL_KEYS) {
      expect(i18n.exists(`apiErrors.${key}`), key).toBe(true);
      const expected = i18n.t(`apiErrors.${key}`);
      expect(expected.trim(), key).not.toBe('');
      expect(expected, key).not.toBe(`apiErrors.${key}`);
      expect(expected.match(/\{[^{}]+\}/g) ?? [], key).toEqual(literal.match(/\{[^{}]+\}/g) ?? []);
      for (const status of [400, 403, 404, 409, 429, 503]) {
        const original = error(literal, status);
        const before = {
          uncertain: isUncertainPurchaseOutcome(original),
          limited: isRateLimitedError(original),
        };
        expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t), literal).toBe(expected);
        expect(getApiErrorMessage(original, '')).toBe(literal);
        expect(original.response.status).toBe(status);
        expect(isUncertainPurchaseOutcome(original)).toBe(before.uncertain);
        expect(isRateLimitedError(original)).toBe(before.limited);
      }
    }
    for (const literal of [
      'File not found: report.csv',
      'Failed to update balance: provider unavailable',
      ' Role not found ',
      'role not found',
      '<b>Operator custom reason</b>',
      'Source squad not found: masked-1',
    ]) {
      expect(getLocalizedApiErrorMessage(error(literal), 'fallback', i18n.t)).toBe(literal);
    }
    const detail = Object.freeze({
      code: 'external_provider',
      message: 'Failed to update balance',
      amount: 12345,
      retry_after: 90,
    });
    const structured = error(detail, 503);
    expect(getLocalizedApiErrorMessage(structured, 'fallback', i18n.t)).toBe(detail.message);
    expect(structured.response.data.detail).toBe(detail);
    // Runtime identifiers and literal template tokens must survive localization.
    for (const token of [
      'ADMIN_IDS/ADMIN_EMAILS',
      'force=true',
      'params.amount_kopeks',
      'reset_traffic',
      'YYYY-MM-DD',
      'REFERRAL_MAX_LEVEL_DEPTH',
      '{content}',
    ]) {
      const match = ADMIN_ERROR_LITERAL_KEYS.find(([literal]) => literal.includes(token));
      expect(match).toBeDefined();
      expect(i18n.t(`apiErrors.${match?.[1]}`)).toContain(token);
    }
  },
);

it('falls back to the exact raw message when admin translations are missing', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', fallbackLng: false, resources: { en: { translation: {} } } });
  for (const [literal] of ADMIN_ERROR_LITERAL_KEYS) {
    expect(getLocalizedApiErrorMessage(error(literal), 'fallback', i18n.t)).toBe(literal);
  }
});
