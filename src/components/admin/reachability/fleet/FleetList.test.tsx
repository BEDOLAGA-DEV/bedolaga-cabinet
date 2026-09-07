// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('../testUtils')).i18nMock());

import type { TargetProgress } from './batchProgress';
import type { FleetRow } from './fleet';
import { installMatchMedia, renderWithProviders } from '../testUtils';
import { FleetList } from './FleetList';

installMatchMedia();

/**
 * Список серверов группами «проблемы сначала»: свёрнутые «Работают», строка со словом-вердиктом,
 * выбор строки, режим отметки вручную и живой прогресс «Проверяем…».
 */

afterEach(cleanup);

let counter = 0;
const row = (over: Partial<FleetRow>): FleetRow => {
  counter += 1;
  return {
    key: `s${counter}.example:443`,
    ref: `h${counter}`,
    label: `Server ${counter}`,
    address: `s${counter}.example:443`,
    purpose: 'regular',
    state: 'ok',
    ok: 15,
    total: 15,
    checkedAt: '2026-09-06T21:14:00Z',
    blocked: [],
    inPanel: true,
    ...over,
  };
};

function fleet(): FleetRow[] {
  counter = 0;
  return [
    ...Array.from({ length: 3 }, () => row({ state: 'down', ok: 0 })),
    row({ state: 'partial', ok: 7, purpose: 'bs', label: 'Russia | LTE | БС' }),
    ...Array.from({ length: 4 }, () =>
      row({ state: 'unchecked', ok: 0, total: 0, checkedAt: null }),
    ),
    ...Array.from({ length: 84 }, () => row({})),
  ];
}

describe('FleetList', () => {
  it('groups servers, collapses the healthy ones and expands them on demand', () => {
    renderWithProviders(
      <FleetList rows={fleet()} selectedKey={null} onSelect={vi.fn()} emptyText="пусто" />,
    );
    for (const [name, count] of [
      ['Не работают', 3],
      ['Работают не у всех', 1],
      ['Не проверяли', 4],
      ['Работают', 84],
    ] as const) {
      const region = screen.getByRole('region', { name });
      expect(within(region).getByText(String(count))).toBeTruthy();
    }
    expect(screen.getAllByRole('button', { name: /Server \d+/ })).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Показать все 84' }));
    expect(screen.getAllByRole('button', { name: /Server \d+/ })).toHaveLength(91);
    expect(screen.getByRole('button', { name: 'Свернуть' })).toBeTruthy();
  });

  it('says the verdict in words and reports the picked server', () => {
    const onSelect = vi.fn();
    const rows = fleet();
    renderWithProviders(
      <FleetList rows={rows} selectedKey={rows[3].key} onSelect={onSelect} emptyText="пусто" />,
    );
    const partial = screen.getByRole('button', { name: /Russia \| LTE \| БС/ });
    expect(partial.getAttribute('aria-current')).toBe('true');
    expect(within(partial).getAllByText('Работает не у всех').length).toBeGreaterThan(0);
    expect(within(partial).getAllByText(/у 7 из 15/).length).toBeGreaterThan(0);
    fireEvent.click(partial);
    expect(onSelect).toHaveBeenCalledWith(rows[3]);
  });

  it('shows checkboxes in picking mode and toggles refs instead of opening', () => {
    const onSelect = vi.fn();
    const onToggle = vi.fn();
    const rows = fleet().slice(0, 4);
    renderWithProviders(
      <FleetList
        rows={rows}
        selectedKey={null}
        onSelect={onSelect}
        emptyText="пусто"
        picking={{ picked: new Set(['h1']), onToggle }}
      />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(4);
    expect(boxes[0].getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Server 2/ }));
    expect(onToggle).toHaveBeenCalledWith('h2');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows live progress words while a batch runs', () => {
    const rows = fleet().slice(0, 4);
    const progress = new Map<string, TargetProgress>([
      [rows[0].key, { state: 'checking', ok: 3, total: 15, done: 5 }],
      [rows[1].key, { state: 'queued', ok: 0, total: 0, done: 0 }],
    ]);
    renderWithProviders(
      <FleetList
        rows={rows}
        selectedKey={null}
        onSelect={vi.fn()}
        emptyText="пусто"
        progress={progress}
      />,
    );
    const first = screen.getByRole('button', { name: /Server 1/ });
    expect(within(first).getAllByText('Проверяем…').length).toBeGreaterThan(0);
    expect(within(first).getAllByText(/у 3 из 15/).length).toBeGreaterThan(0);
    const second = screen.getByRole('button', { name: /Server 2/ });
    expect(within(second).getAllByText('ждёт очереди').length).toBeGreaterThan(0);
  });

  it('shows the empty text when nothing matches', () => {
    renderWithProviders(
      <FleetList
        rows={[]}
        selectedKey={null}
        onSelect={vi.fn()}
        emptyText="По этому фильтру серверов нет"
      />,
    );
    expect(screen.getByText('По этому фильтру серверов нет')).toBeTruthy();
  });
});
