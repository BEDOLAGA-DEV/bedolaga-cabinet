// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/** Проба в фазе «забираем результат» показывает последний ответ API и кнопку «Забрать результат». */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({
  reachabilityApi: { cancelJob: vi.fn(), retrieveJob: vi.fn() },
}));
const hook = vi.hoisted(() => ({ job: null as Job | null }));
vi.mock('./useReachabilityJob', () => ({
  useReachabilityJob: () => ({ job: hook.job, phase: 'running', error: null, refetch: vi.fn() }),
}));

import { JobProgress } from './JobProgress';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

describe('JobProgress', () => {
  it('фаза retrieving: последний ответ API с номером попытки', () => {
    hook.job = {
      id: 10,
      kind: 'probe',
      status: 'running',
      phase: 'retrieving',
      started_at: new Date(Date.now() - 20 * 60_000).toISOString(),
      attempts: 15,
      result: {
        retrieve: {
          code: 'request_in_progress',
          status: 409,
          attempt: 15,
          at: new Date(Date.now() - 2 * 60_000).toISOString(),
          request_id: 'r9',
        },
      },
      legs: [],
      targets: [],
      sni_hosts: [],
      probes: null,
    } as unknown as Job;
    renderWithProviders(<JobProgress jobId={10} onReset={vi.fn()} />);

    expect(
      screen.getByText(/^Последний ответ API: 409 request_in_progress · попытка 15 · /),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Забрать результат' })).toBeTruthy();
  });
});
