// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Простой список тарифов отличается от обычной сетки только подачей. Тесты
 * стерегут то, что подачей не является: нажатие обязано уводить в тот же
 * сценарий, что и кнопка на карточке, иначе человек заплатит не за то.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatAmount: (value: number) => String(value),
    currencySymbol: '₽',
  }),
}));

vi.mock('@/hooks/usePromoDiscount', () => ({
  usePromoDiscount: () => ({
    applyPromoDiscount: (price: number, original?: number) => ({ price, original, percent: null }),
  }),
}));

import { render } from './tariffPickerLiteHarness';

const withPrice = (id: number, name: string, kopeks: number) => ({
  id,
  name,
  periods: [{ days: 30, price_kopeks: kopeks }] as never,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TariffPickerLite', () => {
  it('показывает название, характеристики и цену', () => {
    render([{ ...withPrice(1, 'Базовый', 14900), traffic_limit_label: '200 ГБ', device_limit: 5 }]);

    expect(screen.getByText('Базовый')).toBeTruthy();
    expect(screen.getByText(/200 ГБ/)).toBeTruthy();
    expect(screen.getByText(/149/)).toBeTruthy();
  });

  it('покупка уводит в выбор тарифа', () => {
    const onSelectTariff = vi.fn();
    render([withPrice(1, 'Базовый', 14900)], { onSelectTariff });

    screen.getByRole('button', { name: /Базовый/ }).click();

    expect(onSelectTariff).toHaveBeenCalledTimes(1);
    expect(onSelectTariff.mock.calls[0][0].id).toBe(1);
  });

  it('смена тарифа уходит в свой сценарий, а не в покупку', () => {
    const onSelectTariff = vi.fn();
    const onSwitchTariff = vi.fn();
    render([withPrice(2, 'Премиум', 29900)], {
      subscription: { tariff_id: 1, is_active: true, is_trial: false, is_limited: false },
      onSelectTariff,
      onSwitchTariff,
    });

    screen.getByRole('button', { name: /Премиум/ }).click();

    expect(onSwitchTariff).toHaveBeenCalledWith(2);
    expect(onSelectTariff).not.toHaveBeenCalled();
  });

  it('текущий тариф помечен и предлагает продление', () => {
    const onSelectTariff = vi.fn();
    render([withPrice(1, 'Базовый', 14900)], {
      subscription: { tariff_id: 1, is_active: true, is_trial: false, is_limited: false },
      onSelectTariff,
    });

    expect(screen.getByText('сейчас')).toBeTruthy();
    screen.getByRole('button', { name: /Базовый/ }).click();
    expect(onSelectTariff).toHaveBeenCalledTimes(1);
  });

  it('текущий посуточный тариф не кнопка — он списывается сам', () => {
    render([withPrice(1, 'Посуточный', 1000)], {
      subscription: { tariff_id: 1, is_active: true, is_daily: true, is_trial: false },
    });

    expect(screen.getByText('сейчас')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Посуточный/ })).toBeNull();
  });

  it('безлимит по устройствам пишется словами, а не нулём', () => {
    render([{ ...withPrice(1, 'Безлимит', 49900), device_limit: 0 }]);

    expect(screen.getByText(/Устройств без ограничений/)).toBeTruthy();
  });

  it('старая цена показана зачёркнутой рядом с новой', () => {
    render([
      {
        id: 1,
        name: 'Со скидкой',
        periods: [{ days: 30, price_kopeks: 9900, original_price_kopeks: 14900 }] as never,
      },
    ]);

    const was = screen.getByText(/149/);
    expect(was.className).toContain('line-through');
  });
});
