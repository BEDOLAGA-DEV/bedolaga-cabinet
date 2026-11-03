import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import { getLocalizedApiErrorMessage } from './api-error-display';

it('localizes each owned monetary schema without changing scalar fields', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'zh',
    resources: {
      zh: {
        translation: {
          apiErrors: {
            moneyMissing: '余额不足，还差 {{amount}}',
            moneyDevices: '余额不足',
            moneyDailyResume: '余额不足，无法恢复按日订阅',
            moneyDeductionFailed: '余额扣款失败',
          },
        },
      },
    },
  });
  const cases = [
    [
      '/cabinet/subscription/renew',
      {
        code: 'insufficient_funds',
        message: 'Недостаточно средств. Не хватает 12.3 ₽',
        missing_amount: 1230,
        cart_saved: true,
      },
      '余额不足，还差 12.3 ₽',
    ],
    [
      '/cabinet/subscription/devices',
      {
        code: 'insufficient_funds',
        error: 'Insufficient balance',
        required_kopeks: 500,
        current_kopeks: 100,
        missing_kopeks: 400,
      },
      '余额不足',
    ],
    [
      '/cabinet/subscription/pause',
      {
        code: 'insufficient_balance',
        message: 'Insufficient balance to resume daily subscription',
        required: 500,
        balance: 100,
      },
      '余额不足，无法恢复按日订阅',
    ],
    [
      '/cabinet/subscription/pause',
      {
        code: 'insufficient_balance',
        message: 'Balance deduction failed',
        required: 500,
        balance: 500,
      },
      '余额扣款失败',
    ],
  ] as const;
  for (const [url, detail, expected] of cases) {
    Object.freeze(detail);
    const error = {
      isAxiosError: true,
      config: { url, method: 'post', baseURL: '/api' },
      response: { status: 402, data: { detail } },
    };
    expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(expected);
    expect(error.response.data.detail).toBe(detail);
  }
});

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
const resources = { ru, en, zh, fa };
const payloads = [
  {
    url: '/cabinet/subscription/purchase-tariff',
    key: 'moneyMissing',
    amount: '12.3 ₽',
    detail: {
      code: 'insufficient_funds',
      message: 'Недостаточно средств. Не хватает 12.3 ₽',
      missing_amount: 1230,
      cart_saved: true,
      cart_mode: 'purchase',
    },
  },
  {
    url: '/cabinet/subscription/renew',
    key: 'moneyMissing',
    amount: '12 ₽',
    detail: {
      code: 'insufficient_funds',
      message: 'Недостаточно средств. Не хватает 12 ₽',
      missing_amount: 1200,
      cart_saved: true,
      cart_mode: 'extend',
    },
  },
  {
    url: '/cabinet/subscription/traffic',
    key: 'moneyMissing',
    amount: '12.34 ₽',
    detail: {
      code: 'insufficient_funds',
      message: 'Недостаточно средств. Не хватает 12.34 ₽',
      missing_amount: 1234,
      cart_saved: true,
    },
  },
  {
    url: '/cabinet/subscription/tariff/switch',
    key: 'moneyMissing',
    amount: '12.34 ₽',
    detail: {
      code: 'insufficient_funds',
      message: 'Insufficient funds. Missing 12.34 ₽',
      missing_amount: 1234,
    },
  },
  {
    url: '/cabinet/subscription/devices',
    key: 'moneyDevices',
    detail: {
      code: 'insufficient_funds',
      error: 'Insufficient balance',
      required_kopeks: 500,
      current_kopeks: 100,
      missing_kopeks: 400,
      cart_saved: true,
    },
  },
  {
    url: '/cabinet/subscription/devices/purchase',
    key: 'moneyDevices',
    detail: {
      code: 'insufficient_funds',
      error: 'Insufficient balance',
      required_kopeks: 500,
      current_kopeks: -100,
      missing_kopeks: 600,
      cart_saved: true,
    },
  },
  {
    url: '/cabinet/subscription/pause',
    key: 'moneyDailyResume',
    detail: {
      code: 'insufficient_balance',
      message: 'Insufficient balance to resume daily subscription',
      required: 500,
      balance: 100,
    },
  },
  {
    url: '/cabinet/subscription/pause',
    key: 'moneyDeductionFailed',
    detail: {
      code: 'insufficient_balance',
      message: 'Balance deduction failed',
      required: 500,
      balance: 500,
    },
  },
];
function monetaryError(detail: unknown, url: string | undefined, status = 402, method = 'post') {
  return Object.freeze({
    isAxiosError: true,
    config: Object.freeze({ url, method, baseURL: '/api' }),
    response: Object.freeze({ status, data: Object.freeze({ detail }) }),
  });
}
it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'renders all monetary route/schema contracts in %s and retains original values',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
    });
    for (const { url, key, amount, detail } of payloads) {
      Object.freeze(detail);
      expect(i18n.exists(`apiErrors.${key}`)).toBe(true);
      const serialized = JSON.stringify(detail);
      for (const status of [402, 409, 429, 502, 503, 504]) {
        const error = monetaryError(detail, url, status);
        const raw = getApiErrorMessage(error, 'raw fallback');
        const flags = [
          getApiErrorCode(error),
          isUncertainPurchaseOutcome(error),
          isRateLimitedError(error),
        ];
        const result = getLocalizedApiErrorMessage(error, 'fallback', i18n.t);
        expect(result).toBe(i18n.t(`apiErrors.${key}`, { amount }));
        if (amount) expect(result).toContain(amount);
        expect(JSON.stringify(error.response.data.detail)).toBe(serialized);
        expect(error.response.data.detail).toBe(detail);
        expect(getApiErrorMessage(error, 'raw fallback')).toBe(raw);
        expect([
          getApiErrorCode(error),
          isUncertainPurchaseOutcome(error),
          isRateLimitedError(error),
        ]).toEqual(flags);
      }
      const fallback = typeof detail.message === 'string' ? detail.message : 'fallback';
      for (const error of [
        monetaryError(detail, undefined),
        monetaryError(detail, '/cabinet/provider'),
        monetaryError(detail, url, 402, 'get'),
      ])
        expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(fallback);
    }
  },
);
it('keeps unknown, incomplete and invalid monetary payloads raw', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'ru', resources: { ru: { translation: ru } } });
  for (const example of payloads) {
    const fields = [
      'missing_amount',
      'required_kopeks',
      'current_kopeks',
      'missing_kopeks',
      'required',
      'balance',
    ].filter((field) => field in example.detail);
    for (const field of fields) {
      for (const invalid of [
        undefined,
        null,
        '500',
        false,
        1.25,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MAX_SAFE_INTEGER + 1,
      ]) {
        const detail = Object.freeze({ ...example.detail, [field]: invalid });
        const expected = typeof detail.message === 'string' ? detail.message : 'fallback';
        expect(
          getLocalizedApiErrorMessage(monetaryError(detail, example.url), 'fallback', i18n.t),
        ).toBe(expected);
      }
    }
  }
  for (const message of [
    'Insufficient funds. Missing 12.345 ₽',
    'Insufficient funds. Missing NaN ₽',
    'Insufficient funds. Missing 12.34 USD',
    'Insufficient funds. Missing 12.34 ₽\n',
    'Provider reason',
    'Insufficient funds. Missing 12.34 ₽; purchase completed',
  ]) {
    const detail = { code: 'insufficient_funds', message, missing_amount: 1234 };
    expect(
      getLocalizedApiErrorMessage(
        monetaryError(detail, '/cabinet/subscription/renew'),
        'fallback',
        i18n.t,
      ),
    ).toBe(message);
  }
  const detail = {
    code: 'insufficient_funds',
    message: 'Classic purchase detail',
    cart_saved: true,
  };
  expect(
    getLocalizedApiErrorMessage(
      monetaryError(detail, '/cabinet/subscription/purchase'),
      'fallback',
      i18n.t,
    ),
  ).toBe(detail.message);
});
it('preserves original monetary fallback when locale keys are unavailable', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', fallbackLng: false, resources: { en: { translation: {} } } });
  for (const { url, detail } of payloads)
    expect(getLocalizedApiErrorMessage(monetaryError(detail, url), 'fallback', i18n.t)).toBe(
      typeof detail.message === 'string' ? detail.message : 'fallback',
    );
});
