// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('../testUtils')).i18nMock());

import type { FleetCounts } from './fleet';
import { FleetToolbar } from './FleetToolbar';

/** Фильтры с числами и поиск по имени или адресу сервера. */

afterEach(cleanup);

const counts: FleetCounts = {
  total: 100,
  ok: 84,
  partial: 9,
  down: 3,
  unchecked: 4,
  bs: 40,
  regular: 60,
  stale: 12,
};

describe('FleetToolbar', () => {
  it('shows counts on the filter chips and reports a pick', () => {
    const onFilter = vi.fn();
    render(
      <FleetToolbar counts={counts} filter="all" onFilter={onFilter} query="" onQuery={vi.fn()} />,
    );
    for (const label of [
      'Все 100',
      'Проблемы 12',
      'Не проверяли 4',
      'Под Белый список 40',
      'Обычные 60',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Все 100' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Проблемы 12' }));
    expect(onFilter).toHaveBeenCalledWith('problems');
  });

  it('reports typed search text', () => {
    const onQuery = vi.fn();
    render(
      <FleetToolbar counts={counts} filter="all" onFilter={vi.fn()} query="" onQuery={onQuery} />,
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Найти сервер' }), {
      target: { value: 'ru' },
    });
    expect(onQuery).toHaveBeenCalledWith('ru');
  });
});
