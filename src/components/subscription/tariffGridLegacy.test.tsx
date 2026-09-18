// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Кнопка на карточке тарифа для старой подписки.
 *
 * Старая подписка куплена в классике, тарифа нет, оператор на тарифах. Карточки
 * тарифов писали «Выбрать для продления», хотя продления у такой подписки нет:
 * тариф надевается на неё же. Кнопка говорит то же, что и вся остальная
 * витрина: «Перейти на тариф».
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
});

describe('карточка тарифа для старой подписки', () => {
  it('предлагает перейти на тариф, а не «выбрать для продления»', async () => {
    const { render, cardFor } = await import('./tariffGridHarness');
    render([{ id: 1, name: 'Базовый' }], {
      subscription: { id: 42, is_active: true, is_trial: false, requires_tariff_selection: true },
    });

    const card = cardFor('Базовый');
    expect(card.textContent).toContain('subscription.cta.moveToTariff');
    expect(card.textContent).not.toContain('subscription.tariff.selectForRenewal');
  });

  it('обычной подписке с тарифом по-прежнему предлагает смену тарифа', async () => {
    const { render, cardFor } = await import('./tariffGridHarness');
    render(
      [
        { id: 1, name: 'Базовый' },
        { id: 2, name: 'Премиум' },
      ],
      {
        subscription: { id: 42, is_active: true, is_trial: false, tariff_id: 1 },
      },
    );

    expect(cardFor('Премиум').textContent).not.toContain('subscription.cta.moveToTariff');
  });
});
