import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import { getLocalizedApiErrorMessage } from './api-error-display';

it('translates an audited minimum amount only on its own route while preserving decimals', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'ru',
    resources: {
      ru: { translation: { apiErrors: { template055: 'Минимальная сумма: {{param1}} RUB' } } },
    },
    interpolation: { escapeValue: false },
  });
  const error = {
    isAxiosError: true,
    config: { url: '/cabinet/balance/topup', baseURL: '/api', method: 'post' },
    response: { status: 400, data: { detail: 'Minimum amount is 123.40 RUB' } },
  };
  expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(
    'Минимальная сумма: 123.40 RUB',
  );
});

import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
import { getApiErrorMessage, isRateLimitedError, isUncertainPurchaseOutcome } from './api-error';
import { API_ERROR_TEMPLATE_RULES } from './api-error-template-rules';
import { API_ERROR_TEMPLATE_EXAMPLES } from './api-error-templates.test-data';
const resources = { ru, en, zh, fa };
function apiError(raw: string, url?: string, method = 'post', baseURL = '/api') {
  return Object.freeze({
    isAxiosError: true,
    config: Object.freeze({ url, method, baseURL }),
    response: Object.freeze({ status: 429, data: Object.freeze({ detail: raw }) }),
  });
}
it('has 94 unique source templates and 140 route examples', () => {
  expect(API_ERROR_TEMPLATE_RULES).toHaveLength(94);
  expect(API_ERROR_TEMPLATE_EXAMPLES).toHaveLength(140);
  expect(new Set(API_ERROR_TEMPLATE_RULES.map((rule) => rule.key)).size).toBe(94);
});
it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'renders every source-derived route in %s without changing params or classifiers',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
      interpolation: { escapeValue: false },
    });
    for (const example of API_ERROR_TEMPLATE_EXAMPLES) {
      expect(i18n.exists(`apiErrors.${example.key}`)).toBe(true);
      const expected = i18n.t(`apiErrors.${example.key}`, example.params);
      expect(expected.trim()).not.toBe('');
      const matching = API_ERROR_TEMPLATE_RULES.filter(
        (rule) =>
          rule.pattern.test(example.raw) &&
          rule.routes.some(
            (route) => route.method === example.method && route.path.test(example.url),
          ),
      );
      expect(
        matching.map((rule) => rule.key),
        example.raw,
      ).toEqual([example.key]);
      for (const url of [example.url, `/api${example.url}`, `${example.url}?limit=1#detail`]) {
        const original = apiError(example.raw, url, example.method);
        const before = [isUncertainPurchaseOutcome(original), isRateLimitedError(original)];
        const displayed = getLocalizedApiErrorMessage(original, 'fallback', i18n.t);
        expect(displayed, `${example.key} ${url}`).toBe(expected);
        for (const value of Object.values(example.params)) expect(displayed).toContain(value);
        expect(getApiErrorMessage(original, '')).toBe(example.raw);
        expect(original.response.data.detail).toBe(example.raw);
        expect([isUncertainPurchaseOutcome(original), isRateLimitedError(original)]).toEqual(
          before,
        );
      }
      for (const bad of [
        apiError(example.raw),
        apiError(example.raw, '/cabinet/external-provider'),
        apiError(example.raw, example.url, 'head'),
        apiError(example.raw, `https://provider.example${example.url}`),
        apiError(example.raw, `//provider.example${example.url}`),
      ]) {
        expect(getLocalizedApiErrorMessage(bad, 'fallback', i18n.t)).toBe(example.raw);
      }
    }
  },
);
it('preserves unknown amounts, external reasons and hostile-looking parameter strings', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'zh',
    fallbackLng: false,
    resources: { zh: { translation: zh } },
    interpolation: { escapeValue: false },
  });
  for (const raw of [
    'Minimum amount is 12.345 RUB',
    'Minimum amount is 12,34 RUB',
    'Minimum amount is NaN RUB',
    'Minimum amount is 12.34 RUB: provider reason',
    'Provider: Minimum amount is 12.34 RUB',
    'Minimum amount is 12.34 RUB\n',
    'Permission denied: Denied by policy: <custom>',
    'Sync error: provider custom diagnostic',
  ]) {
    expect(
      getLocalizedApiErrorMessage(apiError(raw, '/cabinet/balance/topup'), 'fallback', i18n.t),
    ).toBe(raw);
  }
  for (const url of [
    '/cabinet/balance/../balance/topup',
    '/cabinet/balance/%2e%2e/balance/topup',
    '/cabinet/balance%2ftopup',
    '/cabinet/balance/topup/extra',
    'file:///cabinet/balance/topup',
  ]) {
    const raw = 'Minimum amount is 12.34 RUB';
    expect(getLocalizedApiErrorMessage(apiError(raw, url), 'fallback', i18n.t)).toBe(raw);
  }
  for (const param of [
    '<b>custom & name</b>',
    '{{injected}} $t(apiErrors.ownGift)',
    '$& \\ $1',
    'نام-中文-имя',
  ]) {
    const raw = `Slug "${param}" is reserved and cannot be used`;
    const result = getLocalizedApiErrorMessage(
      apiError(raw, '/cabinet/admin/landings'),
      'fallback',
      i18n.t,
    );
    expect(result).toBe(i18n.t('apiErrors.template015', { param1: param }));
    expect(result).toContain(param);
  }
  const raw = 'Minimum amount is 123.40 RUB';
  const expected = i18n.t('apiErrors.template055', { param1: '123.40' });
  expect(
    getLocalizedApiErrorMessage(
      apiError(
        raw,
        'https://api.example/api/cabinet/balance/topup',
        'post',
        'https://api.example/api',
      ),
      'fallback',
      i18n.t,
    ),
  ).toBe(expected);
  expect(
    getLocalizedApiErrorMessage(
      apiError(
        raw,
        'https://provider.example/api/cabinet/balance/topup',
        'post',
        'https://api.example/api',
      ),
      'fallback',
      i18n.t,
    ),
  ).toBe(raw);
  expect(
    getLocalizedApiErrorMessage(
      apiError(raw, '/balance/topup', 'post', '/api/cabinet'),
      'fallback',
      i18n.t,
    ),
  ).toBe(expected);
});
it('uses raw fallback when template translations are unavailable', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', fallbackLng: false, resources: { en: { translation: {} } } });
  for (const example of API_ERROR_TEMPLATE_EXAMPLES)
    expect(
      getLocalizedApiErrorMessage(
        apiError(example.raw, example.url, example.method),
        'fallback',
        i18n.t,
      ),
    ).toBe(example.raw);
});
