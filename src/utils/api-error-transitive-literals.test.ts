import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import { getLocalizedApiErrorMessage } from './api-error-display';
it('renders an audited recurring service message without changing the raw error', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          apiErrors: {
            transitive001:
              'SBP checkout is unavailable for a trial subscription; pay from your balance',
          },
        },
      },
    },
  });
  const raw = 'СБП-оформление недоступно для триальной подписки — оплатите с баланса';
  const error = { isAxiosError: true, response: { status: 400, data: { detail: raw } } };
  expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(
    'SBP checkout is unavailable for a trial subscription; pay from your balance',
  );
  expect(error.response.data.detail).toBe(raw);
});

import en from '../locales/en.json';
import fa from '../locales/fa.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
import { getApiErrorMessage, isUncertainPurchaseOutcome } from './api-error';
import { TRANSITIVE_ERROR_LITERAL_KEYS } from './api-error-transitive-literals';
const resources = { ru, en, zh, fa };
it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'renders all 89 audited service literals in %s without changing raw codes',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
    });
    expect(TRANSITIVE_ERROR_LITERAL_KEYS).toHaveLength(89);
    expect(new Set(TRANSITIVE_ERROR_LITERAL_KEYS.map(([raw]) => raw)).size).toBe(89);
    for (const [raw, key] of TRANSITIVE_ERROR_LITERAL_KEYS) {
      expect(i18n.exists(`apiErrors.${key}`)).toBe(true);
      const error = Object.freeze({
        isAxiosError: true,
        response: Object.freeze({ status: 409, data: Object.freeze({ detail: raw }) }),
      });
      const before = isUncertainPurchaseOutcome(error);
      expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(
        i18n.t(`apiErrors.${key}`),
      );
      expect(getApiErrorMessage(error, '')).toBe(raw);
      expect(isUncertainPurchaseOutcome(error)).toBe(before);
      const extended = `${raw}: external detail`;
      expect(
        getLocalizedApiErrorMessage(
          { isAxiosError: true, response: { data: { detail: extended } } },
          'fallback',
          i18n.t,
        ),
      ).toBe(extended);
    }
  },
);
