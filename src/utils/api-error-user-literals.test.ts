import { AxiosError, AxiosHeaders } from 'axios';
import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
import { getApiErrorMessage } from './api-error';
import { getLocalizedApiErrorMessage } from './api-error-display';
import { USER_ERROR_LITERAL_KEYS } from './api-error-user-literals';

function error(detail: unknown) {
  const headers = new AxiosHeaders();
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    { headers },
    {},
    {
      status: 400,
      statusText: '',
      headers,
      config: { headers },
      data: { detail },
    },
  );
}
for (const [language, resource] of Object.entries({ ru, en, zh, fa })) {
  describe(`User error display in ${language}`, () => {
    it.each(USER_ERROR_LITERAL_KEYS)('%s', async (raw, key) => {
      const expected = (resource.apiErrors as Record<string, unknown>)[key];
      expect(typeof expected).toBe('string');
      expect(expected).not.toBe('');
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        fallbackLng: false,
        resources: { [language]: { translation: resource } },
      });
      const original = error(raw);
      const before = JSON.stringify(original.response?.data);
      expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(expected);
      expect(getApiErrorMessage(original, '')).toBe(raw);
      expect(JSON.stringify(original.response?.data)).toBe(before);
    });
    it('does not translate a similar provider message or change auth-link classification', async () => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        fallbackLng: false,
        resources: { [language]: { translation: resource } },
      });
      const raw = 'Provider diagnostic: Merge token is invalid or expired';
      expect(getLocalizedApiErrorMessage(error(raw), 'fallback', i18n.t)).toBe(raw);
      const original = error('Account merge failed due to an internal error');
      const classifiedBefore = getApiErrorMessage(original, '').includes('merge');
      getLocalizedApiErrorMessage(original, 'fallback', i18n.t);
      expect(getApiErrorMessage(original, '').includes('merge')).toBe(classifiedBefore);
      const operator = { code: 'provider_custom', message: 'Offer not found' };
      expect(getLocalizedApiErrorMessage(error(operator), 'fallback', i18n.t)).toBe(
        operator.message,
      );
    });
  });
}
it('has ninety distinct exact messages and translation keys', () => {
  expect(USER_ERROR_LITERAL_KEYS).toHaveLength(90);
  expect(new Set(USER_ERROR_LITERAL_KEYS.map(([raw]) => raw)).size).toBe(90);
  expect(new Set(USER_ERROR_LITERAL_KEYS.map(([, key]) => key)).size).toBe(90);
});
