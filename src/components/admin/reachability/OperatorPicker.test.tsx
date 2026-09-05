// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';

/**
 * Каждая симка — отдельное списание. Ничего не отмечается само; быстрые выборы
 * названы по действию («Выбрать всех с БС», «Выбрать весь округ», «Как в прошлый раз»).
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { getUnits: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { OperatorPicker } from './OperatorPicker';
import { installMatchMedia, renderWithProviders, unit } from './testUtils';
import { rememberSelection } from './unitSelection';

const UNITS = [
  unit('mts|цфо|off', 'off', 'cfo'),
  unit('mts|пфо|on', 'on', 'pfo'),
  unit('tele2|цфо|on', 'on', 'cfo'),
  unit('yota|уфо|off', 'off', 'urfo', false),
];

installMatchMedia();

beforeEach(() => {
  resetSafeStorage();
  localStorage.clear();
  vi.mocked(reachabilityApi.getUnits).mockResolvedValue(UNITS);
});
afterEach(cleanup);

async function renderPicker(onChange = vi.fn(), selected: string[] = []) {
  renderWithProviders(<OperatorPicker kind="probe" selected={selected} onChange={onChange} />);
  await screen.findByRole('button', { name: /Выбрать весь округ CFO/ });
  return onChange;
}

describe('OperatorPicker', () => {
  it('не подставляет прошлый выбор сам, только по «Как в прошлый раз»', async () => {
    rememberSelection('probe', ['mts|пфо|on', 'нет-такой|цфо|on']);
    const onChange = await renderPicker();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Как в прошлый раз/ }));
    expect(onChange).toHaveBeenCalledWith(['mts|пфо|on']);
  });

  it('«Выбрать всех с БС» отмечает только доступные симки с Белым списком', async () => {
    const onChange = await renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать всех с БС' }));
    expect(onChange).toHaveBeenCalledWith(['mts|пфо|on', 'tele2|цфо|on']);
  });

  it('когда все с БС выбраны, кнопка меняется на «Снять всех с БС»', async () => {
    const onChange = await renderPicker(vi.fn(), ['mts|пфо|on', 'tele2|цфо|on']);
    fireEvent.click(screen.getByRole('button', { name: 'Снять всех с БС' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('округ отмечается целиком одной кнопкой, оператор — своей', async () => {
    const onChange = await renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /Выбрать весь округ CFO/ }));
    expect(onChange).toHaveBeenCalledWith(['mts|цфо|off', 'tele2|цфо|on']);
    fireEvent.click(screen.getAllByRole('button', { name: /^MTS/ })[0]);
    expect(onChange).toHaveBeenLastCalledWith(['mts|цфо|off']);
  });

  it('недоступная симка отключена и подписана «нет связи»', async () => {
    await renderPicker();
    const yota = screen.getByRole('button', { name: /^YOTA/ }) as HTMLButtonElement;
    expect(yota.disabled).toBe(true);
    expect(yota.textContent).toContain('нет связи');
  });

  it('«Сбросить выбор» есть только при выборе', async () => {
    await renderPicker();
    expect(screen.queryByRole('button', { name: 'Сбросить выбор' })).toBeNull();
  });
});
