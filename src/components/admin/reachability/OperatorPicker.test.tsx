// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';

/**
 * Операторы как на bsbord.com: «БС · N / без БС · N» сверху, округа строками с чекбоксом и счётом,
 * у каждой симки точка режима (зелёная — с Белым списком, янтарная — без), «Сбросить» очищает.
 * Ничего не отмечается само.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

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
});
afterEach(cleanup);

/** Живой выбор: пресеты и чипы переключают состояние, как в форме. */
function Picker({ initial = [] as string[], onChange = vi.fn() }) {
  const [selected, setSelected] = useState<string[]>(initial);
  return (
    <OperatorPicker
      kind="probe"
      units={UNITS}
      selected={selected}
      onChange={(keys) => {
        onChange(keys);
        setSelected(keys);
      }}
    />
  );
}

describe('OperatorPicker', () => {
  it('«БС» и «без БС» с числами отмечают и снимают симки своего режима', () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker onChange={onChange} />);
    const bs = screen.getByRole('button', { name: /^БС 2/ });
    fireEvent.click(bs);
    expect(onChange).toHaveBeenLastCalledWith(['mts|пфо|on', 'tele2|цфо|on']);
    expect(bs.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('выбрано 2 / 3')).toBeTruthy();
    fireEvent.click(bs);
    expect(onChange).toHaveBeenLastCalledWith([]);
    fireEvent.click(screen.getByRole('button', { name: /^без БС 1/ }));
    expect(onChange).toHaveBeenLastCalledWith(['mts|цфо|off']);
  });

  it('округ отмечается целиком чекбоксом, симка без Белого списка подписана «без БС»', () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Все симки ЦФО' }));
    expect(onChange).toHaveBeenLastCalledWith(['mts|цфо|off', 'tele2|цфо|on']);
    const mtsCfo = screen.getByRole('button', { name: /^МТС без БС/ });
    expect(mtsCfo.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(mtsCfo);
    expect(onChange).toHaveBeenLastCalledWith(['tele2|цфо|on']);
    expect((screen.getByRole('button', { name: /^Yota/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('«Сбросить» есть только при выборе и очищает его', () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker initial={['mts|пфо|on', 'mts|цфо|off']} onChange={onChange} />);
    expect(screen.getByText('выбрано 2 / 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole('button', { name: 'Сбросить' })).toBeNull();
  });

  it('«Как в прошлый раз» есть только с памятью и подставляет её без чужих ключей', () => {
    renderWithProviders(<Picker />);
    expect(screen.queryByRole('button', { name: 'Как в прошлый раз' })).toBeNull();
    cleanup();
    rememberSelection('probe', ['mts|пфо|on', 'нет-такой|цфо|on']);
    const onChange = vi.fn();
    renderWithProviders(<Picker onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Как в прошлый раз' }));
    expect(onChange).toHaveBeenLastCalledWith(['mts|пфо|on']);
  });
});
