// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';

/**
 * Плоский список без рамок: пресеты словами, операторы группами, округа — чипами,
 * «без Белого списка» — словом рядом. Ничего не отмечается само.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { getUnits: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { OperatorPicker } from './OperatorPicker';
import { installMatchMedia, renderWithProviders, unit } from './testUtils';
import { rememberSelection } from './unitSelection';

const UNITS = [
  { ...unit('mts|цфо|off', 'off', 'цфо'), name: 'МТС' },
  { ...unit('mts|пфо|on', 'on', 'пфо'), name: 'МТС' },
  { ...unit('tele2|цфо|on', 'on', 'цфо'), name: 'Tele2' },
  { ...unit('yota|уфо|off', 'off', 'уфо', false), name: 'Yota' },
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
  await screen.findByRole('group', { name: 'МТС' });
  return onChange;
}

describe('OperatorPicker', () => {
  it('не подставляет прошлый выбор сам, только по «Как в прошлый раз»', async () => {
    rememberSelection('probe', ['mts|пфо|on', 'нет-такой|цфо|on']);
    const onChange = await renderPicker();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Как в прошлый раз' }));
    expect(onChange).toHaveBeenCalledWith(['mts|пфо|on']);
  });

  it('«Все с Белым списком» отмечает только доступные симки с ним', async () => {
    const onChange = await renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Все с Белым списком' }));
    expect(onChange).toHaveBeenCalledWith(['mts|пфо|on', 'tele2|цфо|on']);
  });

  it('оператор отмечается целиком, округ — чипом; «без Белого списка» подписано словом', async () => {
    const onChange = await renderPicker();
    const mts = screen.getByRole('group', { name: 'МТС' });
    fireEvent.click(within(mts).getByRole('button', { name: 'Все симки МТС' }));
    expect(onChange).toHaveBeenCalledWith(['mts|цфо|off', 'mts|пфо|on']);
    fireEvent.click(within(mts).getByRole('button', { name: /^ЦФО/ }));
    expect(onChange).toHaveBeenLastCalledWith(['mts|цфо|off']);
    expect(within(mts).getByRole('button', { name: /^ЦФО/ }).textContent).toContain('без');
  });

  it('симка без связи не показывается, «Сбросить» есть только при выборе', async () => {
    await renderPicker();
    expect(screen.queryByRole('group', { name: 'Yota' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Сбросить' })).toBeNull();
  });
});
