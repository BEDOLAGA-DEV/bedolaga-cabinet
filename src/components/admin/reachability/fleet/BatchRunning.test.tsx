// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Batch } from '@/api/reachability';

vi.mock('react-i18next', async () => (await import('../testUtils')).i18nMock());

import { installMatchMedia, renderWithProviders } from '../testUtils';
import { BatchAside, BatchRunning } from './BatchRunning';
import type { FleetRow } from './fleet';

/** Экран идущей проверки: заголовок с числом серверов, полоса, остаток времени, «Остановить», список по серверам. */

installMatchMedia();
afterEach(cleanup);

const batch: Batch = {
  id: 1,
  status: 'running',
  phase: null,
  scope: { kind: 'problems', host_refs: [] },
  total_targets: 3,
  done_targets: 1,
  estimated_kopeks: 1920,
  cost_kopeks: null,
  error_message: null,
  created_at: null,
  started_at: '2026-09-07T11:50:00Z',
  finished_at: null,
  jobs: [
    {
      id: 10,
      status: 'done',
      phase: null,
      target_keys: ['a.example:443'],
      cost_kopeks: 640,
      partial: null,
    },
    {
      id: 11,
      status: 'running',
      phase: 'retrieving',
      target_keys: ['b.example:443', 'c.example:443'],
      cost_kopeks: null,
      partial: {
        done: 2,
        total: 4,
        elapsed_sec: 60,
        legs: [
          {
            target: 'b.example:443',
            operator: 'mts',
            region: 'ЦФО',
            dpi: 'on',
            state: 'done',
            verdict: 'reachable',
            latency_ms: 40,
          },
          {
            target: 'b.example:443',
            operator: 'tele2',
            region: 'ЦФО',
            dpi: 'on',
            state: 'done',
            verdict: 'blocked',
            latency_ms: null,
          },
          {
            target: 'c.example:443',
            operator: 'mts',
            region: 'ЦФО',
            dpi: 'on',
            state: 'running',
            verdict: null,
            latency_ms: null,
          },
          {
            target: 'c.example:443',
            operator: 'tele2',
            region: 'ЦФО',
            dpi: 'on',
            state: 'queued',
            verdict: null,
            latency_ms: null,
          },
        ],
      },
    },
    {
      id: 12,
      status: 'pending',
      phase: null,
      target_keys: ['d.example:443'],
      cost_kopeks: null,
      partial: null,
    },
  ],
};
const row = (key: string, label: string): FleetRow => ({
  key,
  ref: key,
  label,
  address: key,
  purpose: 'regular',
  state: 'ok',
  ok: 0,
  total: 0,
  checkedAt: null,
  blocked: [],
  inPanel: true,
});
const rows = [
  row('a.example:443', 'Alpha'),
  row('b.example:443', 'Bravo'),
  row('c.example:443', 'Charlie'),
  row('d.example:443', 'Delta'),
];

describe('BatchRunning', () => {
  it('tells how far the check went and lets it stop', () => {
    const onStop = vi.fn();
    renderWithProviders(
      <BatchRunning batch={batch} onStop={onStop} stopping={false} estimatedMinutes={15} />,
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Проверяем 3 сервера');
    expect(screen.getByText('Готово 1 из 3 · ещё около 10 минут')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    expect(screen.getByText(/Можно закрыть страницу/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Остановить' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('shows only the done count while the estimate is unknown', () => {
    renderWithProviders(
      <BatchRunning batch={batch} onStop={vi.fn()} stopping={false} estimatedMinutes={null} />,
    );
    expect(screen.getByText('Готово 1 из 3')).toBeTruthy();
  });
});

describe('BatchAside', () => {
  it('lists servers in the order done, checking, queued with words and money so far', () => {
    renderWithProviders(<BatchAside batch={batch} rows={rows} />);
    const list = screen.getByRole('list');
    const items = within(list)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(items[0]).toContain('Alpha');
    expect(items[0]).toContain('только что');
    expect(items[1]).toContain('Bravo');
    expect(items[1]).toContain('у 1 из 2');
    expect(items[2]).toContain('Charlie');
    expect(items[2]).toContain('Проверяем…');
    expect(items[3]).toContain('Delta');
    expect(items[3]).toContain('ждёт очереди');
    expect(screen.getByText('Списано пока: ◈ 640 cred')).toBeTruthy();
  });
});
