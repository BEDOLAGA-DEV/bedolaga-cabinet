// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/api/reachability';

/**
 * Экран прогресса — для обычных людей: простые слова, без кодов, кнопок «забрать» и ответов API.
 * Страница обновляется сама, об этом прямо написано.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());
vi.mock('@/api/reachability', () => ({ reachabilityApi: { cancelJob: vi.fn() } }));
const hook = vi.hoisted(() => ({
  job: null as Job | null,
  phase: 'running' as string,
  error: null as string | null,
}));
vi.mock('./useReachabilityJob', () => ({
  useReachabilityJob: () => ({
    job: hook.job,
    phase: hook.phase,
    error: hook.error,
    refetch: vi.fn(),
  }),
}));

import { JobProgress } from './JobProgress';
import { installMatchMedia, renderWithProviders } from './testUtils';

installMatchMedia();
afterEach(cleanup);

const probe = (patch: Partial<Job>): Job =>
  ({
    id: 10,
    kind: 'probe',
    status: 'running',
    phase: 'retrieving',
    started_at: new Date(Date.now() - 20 * 60_000).toISOString(),
    attempts: 15,
    result: { retrieve: { code: 'request_in_progress', status: 409, attempt: 15 } },
    legs: [],
    targets: [],
    sni_hosts: [],
    probes: null,
    error_code: null,
    error_message: null,
    ...patch,
  }) as unknown as Job;

describe('JobProgress', () => {
  it('долгая проба: простыми словами, что ждём и что страница обновится сама', () => {
    hook.job = probe({});
    hook.phase = 'running';
    renderWithProviders(<JobProgress jobId={10} onReset={vi.fn()} />);

    expect(screen.getByText(/^Проверка ещё идёт, ждём/)).toBeTruthy();
    expect(screen.getByText(/Страница обновится сама/)).toBeTruthy();
    expect(screen.queryByText(/Последний ответ API/)).toBeNull();
    expect(screen.queryByText(/request_in_progress/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Забрать результат' })).toBeNull();
  });

  it('ошибка: текст без служебного кода в скобках', () => {
    hook.job = probe({
      status: 'failed',
      phase: null,
      error_code: 'probe_stalled',
      error_message: 'Сервис не ответил',
    });
    hook.phase = 'failed';
    hook.error = 'Сервис не ответил';
    renderWithProviders(<JobProgress jobId={10} onReset={vi.fn()} />);

    expect(screen.getByText(/Сервис не ответил/)).toBeTruthy();
    expect(screen.queryByText(/probe_stalled/)).toBeNull();
  });
});
