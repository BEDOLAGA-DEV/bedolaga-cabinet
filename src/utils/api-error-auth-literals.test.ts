import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
import { getApiErrorMessage, isUncertainPurchaseOutcome } from './api-error';
import { AUTH_ERROR_LITERAL_KEYS } from './api-error-auth-literals';
import { getLocalizedApiErrorMessage } from './api-error-display';

const resources = { ru, en, zh, fa };

describe.each(Object.keys(resources) as (keyof typeof resources)[])(
  'auth errors in %s',
  (language) => {
    it('renders every owned literal in the requested language without changing raw data', async () => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        fallbackLng: false,
        resources: { [language]: { translation: resources[language] } },
      });
      expect(AUTH_ERROR_LITERAL_KEYS).toHaveLength(41);
      for (const [literal, key] of AUTH_ERROR_LITERAL_KEYS) {
        const response = Object.freeze({ status: 401, data: Object.freeze({ detail: literal }) });
        const error = Object.freeze({ isAxiosError: true, response });
        const expected = i18n.t(`apiErrors.${key}`);
        expect(expected).not.toBe(`apiErrors.${key}`);
        if (language !== 'en') expect(expected).not.toBe(literal);
        expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(expected);
        expect(getApiErrorMessage(error, '')).toBe(literal);
        expect(isUncertainPurchaseOutcome(error)).toBe(false);
      }
      const custom = {
        isAxiosError: true,
        response: { status: 403, data: { detail: 'Operator-specific reason' } },
      };
      expect(getLocalizedApiErrorMessage(custom, 'fallback', i18n.t)).toBe(
        'Operator-specific reason',
      );
    });
  },
);
