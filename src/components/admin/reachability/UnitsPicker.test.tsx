// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';

/**
 * Симки всегда на виду: быстрый выбор «С Белым списком / Без / Все / Как в прошлый раз»,
 * под ним сетка отдельных симок двумя группами. Подсвечен тот быстрый выбор, что совпадает
 * с выбором целиком; иначе список отдельных симок раскрыт сам.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

import { UnitsPicker } from './UnitsPicker';
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
});
afterEach(cleanup);

function renderPicker(selected: string[] = [], onChange = vi.fn()) {
  renderWithProviders(
    <UnitsPicker kind="probe" units={UNITS} selected={selected} onChange={onChange} />,
  );
  return onChange;
}

describe('UnitsPicker', () => {
  it('быстрый выбор с числами: «С Белым списком» отмечает доступные симки с ним, «Все» — все', () => {
    const onChange = renderPicker();
    const quick = screen.getByRole('group', { name: 'Быстрый выбор' });
    const bs = within(quick).getByRole('button', { name: /С Белым списком/ });
    expect(bs.textContent).toContain('2');
    fireEvent.click(bs);
    expect(onChange).toHaveBeenLastCalledWith(['mts|пфо|on', 'tele2|цфо|on']);
    fireEvent.click(within(quick).getByRole('button', { name: /^Все/ }));
    expect(onChange).toHaveBeenLastCalledWith(['mts|пфо|on', 'tele2|цфо|on', 'mts|цфо|off']);
    fireEvent.click(within(quick).getByRole('button', { name: /Без Белого списка/ }));
    expect(onChange).toHaveBeenLastCalledWith(['mts|цфо|off']);
  });

  it('совпавший быстрый выбор подсвечен, список отдельных симок свёрнут', () => {
    renderPicker(['mts|пфо|on', 'tele2|цфо|on']);
    const quick = screen.getByRole('group', { name: 'Быстрый выбор' });
    expect(
      within(quick)
        .getByRole('button', { name: /С Белым списком/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByText('выбрано 2 из 3')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'С Белым списком' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Отдельные симки' }));
    expect(screen.getByRole('group', { name: 'С Белым списком' })).toBeTruthy();
  });

  it('свой набор: сетка раскрыта сама, симка переключается чипом, группа снимается целиком', () => {
    const onChange = renderPicker(['tele2|цфо|on']);
    const bsGroup = screen.getByRole('group', { name: 'С Белым списком' });
    const mtsPfo = within(bsGroup).getByRole('button', { name: /МТС.*ПФО/ });
    expect(mtsPfo.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(mtsPfo);
    expect(onChange).toHaveBeenLastCalledWith(['tele2|цфо|on', 'mts|пфо|on']);
    fireEvent.click(within(bsGroup).getByRole('button', { name: 'Снять' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    const regular = screen.getByRole('group', { name: 'Без Белого списка' });
    fireEvent.click(within(regular).getByRole('button', { name: 'Все' }));
    expect(onChange).toHaveBeenLastCalledWith(['tele2|цфо|on', 'mts|цфо|off']);
    expect(within(regular).queryByRole('button', { name: /Yota/ })).toBeNull();
  });

  it('«Как в прошлый раз» появляется только с памятью и подставляет её', () => {
    expect(screen.queryByRole('button', { name: 'Как в прошлый раз' })).toBeNull();
    cleanup();
    rememberSelection('probe', ['mts|пфо|on', 'нет-такой|цфо|on']);
    const onChange = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Как в прошлый раз' }));
    expect(onChange).toHaveBeenLastCalledWith(['mts|пфо|on']);
  });

  it('ничего не выбрано: так и написано', () => {
    renderPicker([]);
    expect(screen.getByText('Симки не выбраны')).toBeTruthy();
  });
});
