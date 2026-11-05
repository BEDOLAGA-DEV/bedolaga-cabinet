import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import { getLocalizedApiErrorMessage } from './api-error-display';
it('localizes only known validation field names without echoing input', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'ru',
    resources: {
      ru: {
        translation: {
          apiErrors: {
            fields: { email: 'Электронная почта' },
            validation: { missing: 'Обязательное поле' },
          },
        },
      },
    },
  });
  const error = {
    isAxiosError: true,
    response: {
      data: {
        detail: [
          {
            loc: ['body', 'email'],
            type: 'missing',
            msg: 'Field required',
            input: 'private-example',
          },
        ],
      },
    },
  };
  expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(
    'Электронная почта: Обязательное поле',
  );
});

import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
const resources = { ru, en, zh, fa };
const fields = [
  'email',
  'password',
  'first_name',
  'last_name',
  'code',
  'amount',
  'amount_kopeks',
  'period_days',
  'device_limit',
  'devices',
  'traffic_gb',
  'tariff_id',
  'subscription_id',
  'promo_code',
  'language',
];
it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'translates the closed common-field set in %s with original diagnostics intact',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
    });
    for (const field of fields) {
      expect(i18n.exists(`apiErrors.fields.${field}`)).toBe(true);
      const item = Object.freeze({
        loc: Object.freeze(['body', 'unknown_parent', 2, field]),
        type: 'missing',
        msg: 'Field required',
        input: 'PRIVATE_INPUT_NOT_FOR_DISPLAY',
        ctx: { secret: 'PRIVATE_CONTEXT_NOT_FOR_DISPLAY' },
      });
      const err = Object.freeze({
        isAxiosError: true,
        response: Object.freeze({ data: Object.freeze({ detail: Object.freeze([item]) }) }),
      });
      const text = getLocalizedApiErrorMessage(err, 'fallback', i18n.t);
      expect(text).toBe(
        `unknown_parent.2.${i18n.t(`apiErrors.fields.${field}`)}: ${i18n.t('apiErrors.validation.missing')}`,
      );
      expect(text).not.toContain('PRIVATE_');
      expect(err.response.data.detail[0]).toBe(item);
    }
    for (const unknown of [
      'unmapped_property',
      '__proto__',
      'apiErrors.emailRegistered',
      'constructor',
    ]) {
      const err = {
        isAxiosError: true,
        response: {
          data: {
            detail: [{ loc: ['body', unknown, 0], type: 'missing', input: 'PRIVATE_INPUT' }],
          },
        },
      };
      expect(getLocalizedApiErrorMessage(err, 'fallback', i18n.t)).toBe(
        `${unknown}.0: ${i18n.t('apiErrors.validation.missing')}`,
      );
    }
  },
);
