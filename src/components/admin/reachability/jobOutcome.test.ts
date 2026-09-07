import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/reachability';
import { jobOperators, jobOutcome } from './jobOutcome';

const legs = (...verdicts: string[]) =>
  verdicts.map((verdict, index) => ({ verdict, op_key: `op${index}|цфо|on`, operator: null }));

const job = (overrides: Record<string, unknown>): Job =>
  ({
    status: 'done',
    kind: 'probe',
    legs: [],
    result: null,
    units_effective: null,
    units_resolved: null,
    ...overrides,
  }) as unknown as Job;

describe('jobOutcome', () => {
  it('идёт → pending, ошибка → down, отмена → na, по легам — ok/warn/down', () => {
    expect(jobOutcome(job({ status: 'running' }))).toBe('pending');
    expect(jobOutcome(job({ status: 'failed' }))).toBe('down');
    expect(jobOutcome(job({ status: 'cancelled' }))).toBe('na');
    expect(jobOutcome(job({ legs: legs('reachable', 'reachable') }))).toBe('ok');
    expect(jobOutcome(job({ legs: legs('reachable', 'blocked') }))).toBe('warn');
    expect(jobOutcome(job({ legs: legs('down', 'blocked') }))).toBe('down');
    expect(jobOutcome(job({ legs: [] }))).toBe('na');
  });

  it('скан судится по числу живых адресов', () => {
    expect(jobOutcome(job({ kind: 'scan', result: { status: { result: { up_n: 3 } } } }))).toBe(
      'ok',
    );
    expect(jobOutcome(job({ kind: 'scan', result: { status: { result: { up_n: 0 } } } }))).toBe(
      'down',
    );
    expect(jobOutcome(job({ kind: 'scan', result: null }))).toBe('na');
  });

  it('операторы задачи — уникальные коды из легов, иначе из симок', () => {
    expect(
      jobOperators(
        job({
          legs: [...legs('reachable'), { verdict: 'down', op_key: 'op0|пфо|on', operator: null }],
        }),
      ),
    ).toEqual(['op0']);
    expect(
      jobOperators(job({ units_effective: ['mts|цфо|on', 'mts|пфо|on', 'yota|цфо|off'] })),
    ).toEqual(['mts', 'yota']);
  });
});
