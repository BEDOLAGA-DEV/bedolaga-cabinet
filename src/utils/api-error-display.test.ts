import { AxiosError, AxiosHeaders } from 'axios';
import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, isUncertainPurchaseOutcome } from './api-error';
import { getLocalizedApiErrorMessage } from './api-error-display';

const samples = {
  ru: [
    'Этот email уже зарегистрирован',
    'Поле обязательно',
    'Значение должно быть больше {{bound}}',
    'Требуется согласие с документами',
  ],
  en: [
    'This email is already registered',
    'This field is required',
    'Value must be greater than {{bound}}',
    'Consent to the legal documents is required',
  ],
  zh: ['此邮箱已注册', '此字段为必填项', '值必须大于 {{bound}}', '需要同意法律文件'],
  fa: [
    'این ایمیل قبلاً ثبت شده است',
    'این فیلد الزامی است',
    'مقدار باید بیشتر از {{bound}} باشد',
    'پذیرش اسناد حقوقی الزامی است',
  ],
};
function error(detail: unknown, status = 400) {
  const headers = new AxiosHeaders();
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    { headers },
    {},
    {
      status,
      statusText: '',
      headers,
      config: { headers },
      data: { detail },
    },
  );
}
async function translator(language: keyof typeof samples) {
  const i18n = createInstance();
  const [emailRegistered, missing, greaterThan, legalConsent] = samples[language];
  await i18n.init({
    lng: language,
    fallbackLng: false,
    resources: {
      [language]: {
        translation: {
          apiErrors: { emailRegistered, legalConsent, validation: { missing, greaterThan } },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return i18n;
}

describe.each(Object.keys(samples) as (keyof typeof samples)[])('API display in %s', (language) => {
  it('translates exact literals and explicit codes without mutating raw data', async () => {
    const i18n = await translator(language);
    const original = error('This email is already registered');
    const before = JSON.stringify(original.response?.data);
    expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(samples[language][0]);
    expect(getApiErrorMessage(original, '')).toBe('This email is already registered');
    expect(JSON.stringify(original.response?.data)).toBe(before);
    expect(
      getLocalizedApiErrorMessage(
        error({ code: 'legal_consent_required', documents: ['terms'] }),
        'fallback',
        i18n.t,
      ),
    ).toBe(samples[language][3]);
  });
  it('validates numeric ctx and never reads input or arbitrary objects', async () => {
    const i18n = await translator(language);
    const input = {
      type: 'greater_than',
      loc: ['body', 'amount'],
      msg: 'Original bound error',
      ctx: { gt: 5, input: 'private' },
      input: 'private',
    };
    expect(getLocalizedApiErrorMessage(error([input]), 'fallback', i18n.t)).toBe(
      `amount: ${samples[language][2].replace('{{bound}}', '5')}`,
    );
    for (const gt of ['5', NaN, Infinity, {}, null]) {
      expect(
        getLocalizedApiErrorMessage(error([{ ...input, ctx: { gt } }]), 'fallback', i18n.t),
      ).toBe('amount: Original bound error');
    }
    expect(
      getLocalizedApiErrorMessage(
        error([{ type: 'missing', loc: ['body', 'items', 2], input: 'private' }]),
        'fallback',
        i18n.t,
      ),
    ).toBe(`items.2: ${samples[language][1]}`);
  });
  it('preserves unknown/provider/operator messages and malformed validation safely', async () => {
    const i18n = await translator(language);
    for (const detail of [
      'Provider rejected <custom>',
      { code: 'maintenance', message: 'Operator planned outage' },
      { code: 'external', message: 'Provider rejected <custom>' },
    ]) {
      expect(getLocalizedApiErrorMessage(error(detail), 'fallback', i18n.t)).toBe(
        typeof detail === 'string' ? detail : detail.message,
      );
    }
    expect(
      getLocalizedApiErrorMessage(
        error([null, 7, 'private', {}, { msg: 5, loc: {} }]),
        'fallback',
        i18n.t,
      ),
    ).toBe('fallback');
    expect(
      getLocalizedApiErrorMessage(
        error([{ type: 'unknown', msg: 'Future validator', loc: ['body', {}] }]),
        'fallback',
        i18n.t,
      ),
    ).toBe('Future validator');
    expect(getLocalizedApiErrorMessage(new Error('private'), 'fallback', i18n.t)).toBe('fallback');
    expect(
      getLocalizedApiErrorMessage(
        error({ code: '__proto__', message: 'Keep this' }),
        'fallback',
        i18n.t,
      ),
    ).toBe('Keep this');
  });
  it('does not alter purchase uncertainty or monetary payloads', async () => {
    const i18n = await translator(language);
    for (const status of [502, 503, 504]) {
      const original = error(
        { code: 'insufficient_funds', message: 'Missing 12.34 RUB', missing_amount: 1234 },
        status,
      );
      expect(getLocalizedApiErrorMessage(original, '', i18n.t)).toBe('Missing 12.34 RUB');
      expect(original.response?.data.detail).toEqual({
        code: 'insufficient_funds',
        message: 'Missing 12.34 RUB',
        missing_amount: 1234,
      });
      expect(isUncertainPurchaseOutcome(original)).toBe(true);
    }
    expect(isUncertainPurchaseOutcome(new AxiosError('timeout'))).toBe(true);
  });
});

it('uses the supplied current translator and falls back instead of leaking missing keys', async () => {
  const i18n = await translator('en');
  const original = error('This email is already registered');
  expect(getLocalizedApiErrorMessage(original, '', i18n.t)).toBe(samples.en[0]);
  const fa = await translator('fa');
  expect(getLocalizedApiErrorMessage(original, '', fa.t)).toBe(samples.fa[0]);
  expect(getLocalizedApiErrorMessage(error('Invalid email or password'), '', i18n.t)).toBe(
    'Invalid email or password',
  );
});

it('uses fallback for empty detail or message while preserving nonempty unknown text', async () => {
  const i18n = await translator('en');
  for (const detail of ['', { message: '' }, { code: 'provider', message: '' }]) {
    expect(getLocalizedApiErrorMessage(error(detail), 'Visible fallback', i18n.t)).toBe(
      'Visible fallback',
    );
    expect(getApiErrorMessage(error(detail), 'Visible fallback')).toBe('');
  }
  expect(getLocalizedApiErrorMessage(error('  Provider text  '), 'fallback', i18n.t)).toBe(
    '  Provider text  ',
  );
});
