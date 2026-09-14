// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Докупка премиум-трафика.
 *
 * Главное требование к блоку — исчезать целиком, когда докупать нечего:
 * премиум-серверы есть далеко не в каждом тарифе, а докупку по ним включают
 * отдельно. Пустая карточка «купить» без пакетов была бы тупиком.
 */

vi.mock('react-i18next', async () =>
  (await import('../../admin/reachability/testUtils')).i18nMock(),
);

const getOptions = vi.fn();
const purchase = vi.fn();

vi.mock('../../../api/subscription', () => ({
  subscriptionApi: {
    getPremiumTrafficOptions: (...args: unknown[]) => getOptions(...args),
    purchasePremiumTraffic: (...args: unknown[]) => purchase(...args),
  },
}));

import type { PremiumTrafficOptions } from '../../../types';
import { installMatchMedia, renderWithProviders } from '../../admin/reachability/testUtils';
import { PremiumTrafficTopupSheet } from './PremiumTrafficTopupSheet';

installMatchMedia();
afterEach(() => {
  cleanup();
  getOptions.mockReset();
  purchase.mockReset();
});

const SQUAD = 'e4f819ca-2cfd-4425-9354-16a262b180c1';

function options(overrides: Partial<PremiumTrafficOptions> = {}): PremiumTrafficOptions {
  return {
    squad_uuid: SQUAD,
    name: 'Мобильный резерв',
    limit_gb: 5,
    extra_gb: 0,
    used_gb: 2,
    is_limited: false,
    max_topup_gb: 10,
    packages: [
      { gb: 1, price_kopeks: 500, price_rubles: 5 },
      { gb: 5, price_kopeks: 2000, price_rubles: 20 },
    ],
    ...overrides,
  };
}

function render(props: Partial<Parameters<typeof PremiumTrafficTopupSheet>[0]> = {}) {
  return renderWithProviders(
    <PremiumTrafficTopupSheet
      open={false}
      onOpen={vi.fn()}
      onClose={vi.fn()}
      subscriptionId={1}
      purchaseOptions={{ balance_kopeks: 100000 } as never}
      isDark
      {...props}
    />,
  );
}

describe('PremiumTrafficTopupSheet', () => {
  it('не показывается, когда премиум-серверов нет', async () => {
    getOptions.mockResolvedValue([]);
    const { container } = render();

    await waitFor(() => expect(getOptions).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('не показывается, когда пакетов на продажу нет', async () => {
    // Докупку включили, но пакеты не завели — покупать нечего.
    getOptions.mockResolvedValue([options({ packages: [] })]);
    render();

    await waitFor(() => expect(getOptions).toHaveBeenCalled());
    expect(screen.queryByText(/Докупить премиум-трафик/)).toBeNull();
  });

  it('в свёрнутом виде предлагает докупку', async () => {
    getOptions.mockResolvedValue([options()]);
    render();

    expect(await screen.findByText('Докупить премиум-трафик')).toBeTruthy();
    expect(screen.getByText('Отдельный лимит для премиум-серверов')).toBeTruthy();
  });

  it('об исчерпанном лимите говорит прямо в свёрнутой кнопке', async () => {
    // Это главная причина сюда зайти — прятать её за раскрытием нельзя.
    getOptions.mockResolvedValue([options({ is_limited: true, used_gb: 5 })]);
    render();

    expect(await screen.findByText(/Лимит исчерпан/)).toBeTruthy();
  });

  it('в раскрытом виде показывает пакеты с ценами и расход', async () => {
    getOptions.mockResolvedValue([options()]);
    render({ open: true });

    expect(await screen.findByText('Мобильный резерв')).toBeTruthy();
    expect(screen.getByText('5 ₽')).toBeTruthy();
    expect(screen.getByText('20 ₽')).toBeTruthy();
    expect(screen.getByText(/2\.0 \/ 5\.0/)).toBeTruthy();
  });

  it('докупленное входит в показанный объём', async () => {
    getOptions.mockResolvedValue([options({ extra_gb: 3, used_gb: 4 })]);
    render({ open: true });

    expect(await screen.findByText(/4\.0 \/ 8\.0/)).toBeTruthy();
  });

  it('пакет сверх потолка недоступен', async () => {
    // Потолок 10 ГБ, докуплено 8 — пакет на 5 уже не влезает, на 1 влезает.
    getOptions.mockResolvedValue([options({ extra_gb: 8 })]);
    render({ open: true });

    const five = (await screen.findByText('5 ГБ')).closest('button') as HTMLButtonElement;
    const one = screen.getByText('1 ГБ').closest('button') as HTMLButtonElement;

    expect(five.disabled).toBe(true);
    expect(one.disabled).toBe(false);
  });

  it('покупает выбранный пакет по конкретному скваду', async () => {
    getOptions.mockResolvedValue([options()]);
    purchase.mockResolvedValue({ success: true });
    render({ open: true });

    fireEvent.click((await screen.findByText('5 ГБ')).closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Купить 5 ГБ' }));

    await waitFor(() => expect(purchase).toHaveBeenCalled());
    expect(purchase.mock.calls[0][0]).toBe(SQUAD);
    expect(purchase.mock.calls[0][1]).toBe(5);
  });
});
