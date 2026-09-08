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
 * Список серверов одной таблицей: группы «проблемы сначала» с чекбоксом на группу, «Выбрать все»
 * и поиск в шапке, строка — чекбокс цели со счётом «у 7 из 15» и давностью, «Подробнее»
 * раскрывает карточку под строкой, живой прогресс «Проверяем…» и «ждёт очереди».
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

const noop = {
  picked: new Set<string>(),
  onToggle: vi.fn(),
  onToggleMany: vi.fn(),
  onDetails: vi.fn(),
  query: '',
  onQuery: vi.fn(),
  emptyText: 'пусто',
};

const serverBoxes = () => screen.getAllByRole('checkbox', { name: /Server \d+|Russia/ });

describe('FleetList', () => {
  it('groups servers, collapses the healthy ones and expands them on demand', () => {
    renderWithProviders(<FleetList rows={fleet()} {...noop} />);
    for (const [name, count] of [
      ['Не работают', 3],
      ['Работают не у всех', 1],
      ['Не проверяли', 4],
      ['Работают', 84],
    ] as const) {
      const region = screen.getByRole('region', { name });
      expect(within(region).getByText(String(count))).toBeTruthy();
    }
    expect(serverBoxes()).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Показать все 84' }));
    expect(serverBoxes()).toHaveLength(92);
    expect(screen.getByRole('button', { name: 'Свернуть' })).toBeTruthy();
  });

  it('считает симки словами, а слово группы в строке не повторяет', () => {
    renderWithProviders(<FleetList rows={fleet()} {...noop} />);
    const partial = screen.getByRole('checkbox', { name: /Russia \| LTE \| БС/ });
    expect(within(partial).getAllByText(/у 7 из 15/).length).toBeGreaterThan(0);
    expect(within(partial).queryByText('Работает не у всех')).toBeNull();
    expect(within(partial).getByTitle('под Белый список').textContent).toBe('БС');
    const down = screen.getByRole('checkbox', { name: /Server 1/ });
    expect(within(down).getAllByText(/у 0 из 15/).length).toBeGreaterThan(0);
    const unchecked = screen.getByRole('checkbox', { name: /Server 5/ });
    expect(within(unchecked).queryByText(/из/)).toBeNull();
  });

  it('строка — чекбокс цели: тап отмечает сервер, «Подробнее» открывает карточку', () => {
    const onToggle = vi.fn();
    const onDetails = vi.fn();
    const rows = fleet().slice(0, 4);
    renderWithProviders(
      <FleetList
        rows={rows}
        picked={new Set(['h1'])}
        onToggle={onToggle}
        onToggleMany={vi.fn()}
        onDetails={onDetails}
        query=""
        onQuery={vi.fn()}
        emptyText="пусто"
      />,
    );
    const boxes = serverBoxes();
    expect(boxes).toHaveLength(4);
    expect(boxes[0].getAttribute('aria-checked')).toBe('true');
    expect(boxes[1].getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('checkbox', { name: /Server 2/ }));
    expect(onToggle).toHaveBeenCalledWith('h2');
    expect(onDetails).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Подробнее' })[0]);
    expect(onDetails).toHaveBeenCalledWith(rows[0]);
  });

  it('чекбокс группы отмечает все её серверы, «Выбрать все» — все видимые', () => {
    const onToggleMany = vi.fn();
    const rows = fleet().slice(0, 8);
    renderWithProviders(
      <FleetList
        rows={rows}
        picked={new Set(['h1'])}
        onToggle={vi.fn()}
        onToggleMany={onToggleMany}
        onDetails={vi.fn()}
        query=""
        onQuery={vi.fn()}
        emptyText="пусто"
      />,
    );
    const down = screen.getByRole('checkbox', { name: /^Не работают/ });
    expect(down.getAttribute('aria-checked')).toBe('mixed');
    fireEvent.click(down);
    expect(onToggleMany).toHaveBeenCalledWith(['h1', 'h2', 'h3'], true);
    const all = screen.getByRole('checkbox', { name: 'Выбрать все' });
    expect(all.getAttribute('aria-checked')).toBe('mixed');
    fireEvent.click(all);
    expect(onToggleMany).toHaveBeenLastCalledWith(
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'],
      true,
    );
  });

  it('полностью отмеченная группа снимается одним тапом', () => {
    const onToggleMany = vi.fn();
    const rows = fleet().slice(0, 4);
    renderWithProviders(
      <FleetList
        rows={rows}
        picked={new Set(['h1', 'h2', 'h3', 'h4'])}
        onToggle={vi.fn()}
        onToggleMany={onToggleMany}
        onDetails={vi.fn()}
        query=""
        onQuery={vi.fn()}
        emptyText="пусто"
      />,
    );
    const down = screen.getByRole('checkbox', { name: /^Не работают/ });
    expect(down.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(down);
    expect(onToggleMany).toHaveBeenCalledWith(['h1', 'h2', 'h3'], false);
    const all = screen.getByRole('checkbox', { name: 'Выбрать все' });
    expect(all.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(all);
    expect(onToggleMany).toHaveBeenLastCalledWith(['h1', 'h2', 'h3', 'h4'], false);
  });

  it('карточка раскрывается под своей строкой', () => {
    const rows = fleet().slice(0, 4);
    renderWithProviders(
      <FleetList
        rows={rows}
        {...noop}
        expandedKey={rows[1].key}
        renderDetails={(row) => <p>карточка {row.label}</p>}
      />,
    );
    expect(screen.getByText('карточка Server 2')).toBeTruthy();
    expect(screen.queryByText('карточка Server 1')).toBeNull();
    const details = screen.getAllByRole('button', { name: 'Подробнее' });
    expect(details[1].getAttribute('aria-expanded')).toBe('true');
    expect(details[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('shows live progress words while a batch runs', () => {
    const rows = fleet().slice(0, 4);
    const progress = new Map<string, TargetProgress>([
      [rows[0].key, { state: 'checking', ok: 3, total: 15, done: 5 }],
      [rows[1].key, { state: 'queued', ok: 0, total: 0, done: 0 }],
    ]);
    renderWithProviders(<FleetList rows={rows} {...noop} progress={progress} />);
    const first = screen.getByRole('checkbox', { name: /Server 1/ });
    expect(within(first).getAllByText('Проверяем…').length).toBeGreaterThan(0);
    expect(within(first).getAllByText(/у 3 из 15/).length).toBeGreaterThan(0);
    expect(first.getAttribute('aria-disabled')).toBe('true');
    const second = screen.getByRole('checkbox', { name: /Server 2/ });
    expect(within(second).getAllByText('ждёт очереди').length).toBeGreaterThan(0);
  });

  it('поиск в шапке сообщает набранное; при пустом фильтре шапка остаётся, чтобы его сбросить', () => {
    const onQuery = vi.fn();
    renderWithProviders(
      <FleetList
        rows={[]}
        {...noop}
        query="zzz"
        onQuery={onQuery}
        emptyText="По этому фильтру серверов нет"
      />,
    );
    expect(screen.getByText('По этому фильтру серверов нет')).toBeTruthy();
    const search = screen.getByRole('searchbox', { name: 'Найти сервер' });
    expect((search as HTMLInputElement).value).toBe('zzz');
    fireEvent.change(search, { target: { value: 'ru' } });
    expect(onQuery).toHaveBeenCalledWith('ru');
    expect(
      (screen.getByRole('checkbox', { name: 'Выбрать все' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
