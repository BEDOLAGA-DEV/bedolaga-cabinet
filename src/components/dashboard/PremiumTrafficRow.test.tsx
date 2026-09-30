// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Строка премиум-трафика: серверы с отдельным лимитом внутри тарифа.
 *
 * Блок обязан исчезать у тарифов без таких серверов — большинство подписок
 * именно такие, и пустая шкала «0 из 0» выглядела бы поломкой.
 */

vi.mock('react-i18next', async () => (await import('../admin/reachability/testUtils')).i18nMock());

import type { PremiumTrafficInfo } from '../../types';
import { installMatchMedia, renderWithProviders } from '../admin/reachability/testUtils';
import PremiumTrafficRow from './PremiumTrafficRow';

installMatchMedia();
afterEach(cleanup);

function item(overrides: Partial<PremiumTrafficInfo> = {}): PremiumTrafficInfo {
  return {
    squad_uuid: 'e4f819ca-2cfd-4425-9354-16a262b180c1',
    name: 'Мобильный резерв',
    limit_gb: 5,
    extra_gb: 0,
    used_gb: 2,
    used_percent: 40,
    is_limited: false,
    topup_available: false,
    ...overrides,
  };
}

describe('PremiumTrafficRow', () => {
  it('не рисует ничего, когда премиум-серверов в тарифе нет', () => {
    const { container } = renderWithProviders(<PremiumTrafficRow items={[]} />);

    expect(container.textContent).toBe('');
  });

  it('показывает название сервера и расход от лимита', () => {
    renderWithProviders(<PremiumTrafficRow items={[item()]} />);

    expect(screen.getByText('Мобильный резерв')).toBeTruthy();
    expect(screen.getByText(/2.*\/.*5/)).toBeTruthy();
  });

  it('без названия подписывает строку общим заголовком', () => {
    renderWithProviders(<PremiumTrafficRow items={[item({ name: null })]} />);

    expect(screen.getByText('Премиум-трафик')).toBeTruthy();
  });

  it('докупленное входит в общий объём и отмечается отдельно', () => {
    // Иначе выросший лимит выглядит как ошибка, а не как результат покупки.
    renderWithProviders(<PremiumTrafficRow items={[item({ extra_gb: 3, used_gb: 4 })]} />);

    expect(screen.getByText(/Докуплено/)).toBeTruthy();
    expect(screen.getByText(/4.*\/.*8/)).toBeTruthy();
  });

  it('исчерпанный лимит объясняет, что доступ приостановлен', () => {
    renderWithProviders(
      <PremiumTrafficRow items={[item({ is_limited: true, used_gb: 5, used_percent: 100 })]} />,
    );

    expect(screen.getByText(/доступ приостановлен/i)).toBeTruthy();
  });

  it('у исчерпанного лимита не показывает отметку о докупке', () => {
    // Докупали, но всё потратили: сообщать «докуплено» рядом с «доступ
    // приостановлен» — противоречие.
    renderWithProviders(
      <PremiumTrafficRow
        items={[item({ is_limited: true, extra_gb: 3, used_gb: 8, used_percent: 100 })]}
      />,
    );

    expect(screen.queryByText(/Докуплено/)).toBeNull();
  });

  it('рисует по строке на каждый премиум-сервер', () => {
    renderWithProviders(
      <PremiumTrafficRow
        items={[item(), item({ squad_uuid: 'second-squad', name: 'Резерв 2' })]}
      />,
    );

    expect(screen.getByText('Мобильный резерв')).toBeTruthy();
    expect(screen.getByText('Резерв 2')).toBeTruthy();
  });
});
