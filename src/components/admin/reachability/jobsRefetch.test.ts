import { describe, expect, it } from 'vitest';
import { jobsRefetchInterval } from './jobsRefetch';

/** Журнал обновляется сам, пока в нём есть незавершённые задачи; иначе не дёргает сервер. */

describe('jobsRefetchInterval', () => {
  it('есть задача в очереди или в работе — раз в 10 секунд', () => {
    expect(jobsRefetchInterval([{ status: 'done' }, { status: 'running' }])).toBe(10_000);
    expect(jobsRefetchInterval([{ status: 'pending' }])).toBe(10_000);
  });

  it('все завершены или список пуст — не обновлять', () => {
    expect(jobsRefetchInterval([{ status: 'done' }, { status: 'failed' }])).toBe(false);
    expect(jobsRefetchInterval([])).toBe(false);
    expect(jobsRefetchInterval(undefined)).toBe(false);
  });
});
