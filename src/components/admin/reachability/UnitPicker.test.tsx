// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';

/**
 * Каждая симка — отдельное списание. Выбор обязан быть явным: ничего не
 * подставляется само, «все» заменены на именованные быстрые выборы.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { getUnits: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { UnitPicker } from './UnitPicker';
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

async function renderPicker(onChange = vi.fn()) {
  renderWithProviders(
    <UnitPicker kind="probe" dpi="any" onDpiChange={vi.fn()} selected={[]} onChange={onChange} />,
  );
  await screen.findByText('MTS');
  return onChange;
}

describe('UnitPicker', () => {
  it('не подставляет прошлый выбор сам — только по кнопке «как в прошлый раз»', async () => {
    rememberSelection('probe', ['mts|пфо|on', 'нет-такой|цфо|on']);
    const onChange = await renderPicker();

    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /как в прошлый раз \(1\)/ }));
    expect(onChange).toHaveBeenCalledWith(['mts|пфо|on']);
  });

  it('без памяти кнопки «как в прошлый раз» нет', async () => {
    await renderPicker();
    expect(screen.queryByRole('button', { name: /как в прошлый раз/ })).toBeNull();
  });

  it('быстрый выбор «с БС» отмечает только доступные симки с Белым списком', async () => {
    const onChange = await renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /отметить симки с БС \(2\)/ }));
    expect(onChange).toHaveBeenCalledWith(['mts|пфо|on', 'tele2|цфо|on']);
  });

  it('галочка оператора отмечает все его доступные симки', async () => {
    const onChange = await renderPicker();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Отметить все симки MTS' }));
    expect(onChange).toHaveBeenCalledWith(['mts|цфо|off', 'mts|пфо|on']);
  });

  it('кнопки «выбрать все» больше нет', async () => {
    await renderPicker();
    await waitFor(() => expect(screen.queryByRole('button', { name: /выбрать все/ })).toBeNull());
  });
});
