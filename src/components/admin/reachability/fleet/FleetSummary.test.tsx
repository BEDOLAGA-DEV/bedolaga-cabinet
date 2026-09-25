// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async () => (await import('../testUtils')).i18nMock());

import type { FleetCounts } from './fleet';
import { FleetSummary } from './FleetSummary';

/** Сводка флота: одно предложение с числом работающих, полоска по тонам, легенда словами. */

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

describe('FleetSummary', () => {
  it('states how many servers work and lists the rest in words', () => {
    render(
      <FleetSummary
        counts={counts}
        checkedAt="2026-09-06T21:14:00Z"
        unitsLine="30 симок на связи"
      />,
    );
    const statement = screen.getByRole('heading', { level: 2 });
    expect(statement.textContent).toBe('Работают 84 из 100 серверов');
    expect(statement.querySelector('span')?.textContent).toBe('84');
    expect(screen.getByText('9 не у всех')).toBeTruthy();
    expect(screen.getByText('3 не работают')).toBeTruthy();
    expect(screen.getByText('4 не проверяли')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('9 не у всех');
    expect(screen.getByText(/30 симок на связи/)).toBeTruthy();
  });

  it('drops empty legend items and celebrates when everything works', () => {
    render(
      <FleetSummary
        counts={{ ...counts, ok: 100, partial: 0, down: 0, unchecked: 0 }}
        checkedAt={null}
        unitsLine=""
      />,
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Работают все 100 серверов');
    expect(screen.queryByText(/не работа/)).toBeNull();
  });

  it('says so when the panel has no servers', () => {
    render(
      <FleetSummary
        counts={{ ...counts, total: 0, ok: 0, partial: 0, down: 0, unchecked: 0 }}
        checkedAt={null}
        unitsLine=""
      />,
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Серверов в панели нет');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
