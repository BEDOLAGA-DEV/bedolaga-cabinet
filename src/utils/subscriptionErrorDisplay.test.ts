import { AxiosError, AxiosHeaders } from 'axios';
import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import { getErrorMessage, getInsufficientBalanceError } from './subscriptionHelpers';
import { isUncertainPurchaseOutcome } from './api-error';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import zh from '../locales/zh.json';
import fa from '../locales/fa.json';

function error(detail: unknown, status = 400) {
  const headers = new AxiosHeaders();
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    { headers },
    {},
    { status, statusText: '', headers, config: { headers }, data: { detail } },
  );
}
for (const [language, resource] of Object.entries({ ru, en, zh, fa })) {
  it(`localizes subscription display without changing monetary parsing (${language})`, async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation: resource } },
    });
    expect(getErrorMessage(error({ code: 'subscription_selection_required' }), i18n.t)).toBe(
      resource.apiErrors.subscriptionSelection,
    );
    const insufficient = error({
      code: 'insufficient_funds',
      message: 'Missing 12.34 RUB',
      missing_amount: 1234,
      total_price: 2000,
      balance: 766,
    });
    expect(getErrorMessage(insufficient, i18n.t)).toBe('Missing 12.34 RUB');
    expect(getInsufficientBalanceError(insufficient)).toEqual({
      required: 2000,
      balance: 766,
      missingAmount: 1234,
    });
    expect(getErrorMessage(error('Provider original message'), i18n.t)).toBe(
      'Provider original message',
    );
    expect(getErrorMessage(new Error('Local original message'), i18n.t)).toBe(
      'Local original message',
    );
    const uncertain = error('Provider timeout', 503);
    expect(getErrorMessage(uncertain, i18n.t)).toBe('Provider timeout');
    expect(isUncertainPurchaseOutcome(uncertain)).toBe(true);
  });
}
