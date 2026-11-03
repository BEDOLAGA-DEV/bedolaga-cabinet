import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import ru from '../locales/ru.json';
import { getLocalizedApiErrorMessage } from './api-error-display';
it('renders an owned code-only purchase conflict on its specific route', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'ru', resources: { ru: { translation: ru } } });
  const error = {
    isAxiosError: true,
    config: { method: 'post', url: '/cabinet/subscription/purchase-tariff', baseURL: '/api' },
    response: { status: 409, data: { detail: { code: 'quote_changed' } } },
  };
  expect(getLocalizedApiErrorMessage(error, 'fallback', i18n.t)).toBe(
    i18n.t('apiErrors.transitive007'),
  );
});

import en from '../locales/en.json';
import fa from '../locales/fa.json';
import zh from '../locales/zh.json';
import { getApiErrorCode, getApiErrorMessage, isUncertainPurchaseOutcome } from './api-error';
const resources = { ru, en, zh, fa };
const selections = [
  ['quote_changed', 'transitive007'],
  ['invalid_provider', 'transitive018'],
  ['invalid_recurrent_price', 'transitive019'],
  ['tariff_unavailable', 'transitive020'],
  ['device_selection_not_available', 'transitive021'],
  ['device_consent_required', 'transitive022'],
  ['checkout_closed', 'transitive026'],
  ['checkout_conflict', 'transitive027'],
  ['invalid_device_limit', 'transitive028'],
  ['quote_unavailable', 'transitive029'],
  ['invalid_period', 'transitive030'],
  ['quote_expired', 'transitive031'],
  ['period_out_of_range', 'transitive032'],
  ['invalid_traffic', 'transitive033'],
  ['price_out_of_range', 'transitive034'],
] as const;
function error(detail: unknown, url?: string, method = 'post') {
  return Object.freeze({
    isAxiosError: true,
    config: Object.freeze({ url, method, baseURL: '/api' }),
    response: Object.freeze({ status: 409, data: Object.freeze({ detail }) }),
  });
}
it.each(Object.keys(resources) as (keyof typeof resources)[])(
  'localizes 15 closed owned codes, fallback, cart and status in %s',
  async (language) => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resources[language] } },
    });
    for (const [code, key] of selections) {
      for (const [url, method] of [
        ['/cabinet/subscription/purchase-tariff', 'post'],
        ['/cabinet/subscription/purchase-tariff/preview', 'post'],
        ['/cabinet/subscription/platega-recurrent/purchase', 'post'],
        ['/cabinet/subscription/lava-recurrent/enable', 'post'],
        ['/cabinet/subscription/cashera-recurrent/purchase-preview', 'get'],
      ]) {
        const detail = Object.freeze({ code });
        const original = error(detail, url, method);
        const raw = getApiErrorMessage(original, 'raw fallback');
        const before = isUncertainPurchaseOutcome(original);
        expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe(
          i18n.t(`apiErrors.${key}`),
        );
        expect(getApiErrorCode(original)).toBe(code);
        expect(getApiErrorMessage(original, 'raw fallback')).toBe(raw);
        expect(isUncertainPurchaseOutcome(original)).toBe(before);
        expect(original.response.data.detail).toBe(detail);
      }
      for (const original of [
        error({ code }),
        error({ code }, '/cabinet/provider'),
        error({ code }, '/cabinet/subscription/purchase-tariff', 'delete'),
      ])
        expect(getLocalizedApiErrorMessage(original, 'fallback', i18n.t)).toBe('fallback');
      const custom = { code, message: 'Provider/operator custom reason <unchanged>' };
      expect(
        getLocalizedApiErrorMessage(
          error(custom, '/cabinet/subscription/purchase-tariff'),
          'fallback',
          i18n.t,
        ),
      ).toBe(custom.message);
      expect(
        getLocalizedApiErrorMessage(
          error({ code, unexpected: 'extra diagnostic' }, '/cabinet/subscription/purchase-tariff'),
          'fallback',
          i18n.t,
        ),
      ).toBe('fallback');
    }
    expect(
      getLocalizedApiErrorMessage(
        error({ code: 'cart_unavailable' }, '/cabinet/subscription/purchase-tariff'),
        'fallback',
        i18n.t,
      ),
    ).toBe(i18n.t('apiErrors.cartUnavailable'));
    const squad = Object.freeze({
      code: 'tariff_servers_unavailable',
      message:
        'Серверы этого тарифа сейчас недоступны. Выберите другой тариф или обратитесь в поддержку.',
    });
    for (const url of [
      '/cabinet/subscription/trial',
      '/cabinet/subscription/purchase-tariff',
      '/cabinet/subscription/tariff/switch',
    ])
      expect(getLocalizedApiErrorMessage(error(squad, url), 'fallback', i18n.t)).toBe(
        i18n.t('apiErrors.tariffServersUnavailable'),
      );
    for (const status of ['disabled', 'expired', 'custom <status>', '{{status}}']) {
      const detail = Object.freeze({
        code: 'subscription_not_active',
        message: `Subscription is not active (status: ${status}). Cannot switch tariff.`,
      });
      for (const url of [
        '/cabinet/subscription/tariff/switch',
        '/cabinet/subscription/tariff/switch/preview',
      ]) {
        const result = getLocalizedApiErrorMessage(error(detail, url), 'fallback', i18n.t);
        expect(result).toBe(
          i18n.t('apiErrors.subscriptionNotActive', {
            status,
            interpolation: { escapeValue: false },
          }),
        );
        expect(result).toContain(status);
      }
      expect(
        getLocalizedApiErrorMessage(error(detail, '/cabinet/provider'), 'fallback', i18n.t),
      ).toBe(detail.message);
    }
    for (const message of [
      'Subscription is not active (status: disabled). Cannot switch tariff. Extra reason',
      'Subscription is not active (status: disabled). Cannot switch tariff.\n',
      'External provider message',
      'Subscription is not active (status: custom(nested)). Cannot switch tariff.',
    ])
      expect(
        getLocalizedApiErrorMessage(
          error(
            { code: 'subscription_not_active', message },
            '/cabinet/subscription/tariff/switch',
          ),
          'fallback',
          i18n.t,
        ),
      ).toBe(message);
    expect(
      getLocalizedApiErrorMessage(
        error('Could not create Platega subscription'),
        'fallback',
        i18n.t,
      ),
    ).toBe(i18n.t('apiErrors.plategaSubscriptionCreateFailed'));
    const provider = 'Could not create Platega subscription: merchant custom reason';
    expect(getLocalizedApiErrorMessage(error(provider), 'fallback', i18n.t)).toBe(provider);
  },
);
