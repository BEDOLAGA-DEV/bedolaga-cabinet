// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/** История без модалок: строка раскрывается на месте, задача из ссылки открыта сразу. */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { listJobs: vi.fn() } }));

import { reachabilityApi } from '@/api/reachability';
import { RecentJobs } from './RecentJobs';
import { installMatchMedia, renderWithProviders } from './testUtils';

const job = (id: number, kind: Job['kind']): Job =>
  ({
    id,
    kind,
    status: 'done',
    targets: [{ kind: 'host', label: `Host ${id}`, target_key: `h${id}:443` }],
    units_resolved: ['mts|цфо|on'],
    units_effective: null,
    legs: [],
    cost_kopeks: 100 * id,
    refunded_kopeks: 0,
    estimate_is_exact: true,
    error_code: null,
    error_message: null,
    result: { ok: true },
    started_at: '2026-09-05T12:00:00+00:00',
    created_at: '2026-09-05T12:00:00+00:00',
  }) as unknown as Job;

installMatchMedia();
beforeEach(() =>
  vi.mocked(reachabilityApi.listJobs).mockResolvedValue({
    items: [job(1, 'probe'), job(2, 'vless')],
    total: 2,
    offset: 0,
    limit: 20,
  }),
);
afterEach(cleanup);

describe('RecentJobs', () => {
  it('раскрывает задачу из ссылки и сворачивает по тапу', async () => {
    renderWithProviders(<RecentJobs initialJobId={2} />);
    await screen.findByText('Host 2');
    expect(screen.getByText('◈ 200 cred ≈ 2,00 ₽')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть' }));
    expect(screen.queryByText('◈ 200 cred ≈ 2,00 ₽')).toBeNull();
  });

  it('без ссылки всё свёрнуто, «Подробности» раскрывает строку', async () => {
    renderWithProviders(<RecentJobs initialJobId={null} />);
    await screen.findByText('Host 1');
    expect(screen.queryByText('◈ 100 cred ≈ 1,00 ₽')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Подробности' })[0]);
    expect(screen.getByText('◈ 100 cred ≈ 1,00 ₽')).toBeTruthy();
  });
});
