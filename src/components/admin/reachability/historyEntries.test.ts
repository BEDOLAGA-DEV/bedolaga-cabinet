import { describe, expect, it } from 'vitest';
import type { Job, Leg, TargetOut } from '@/api/reachability';
import { batchSummary, groupHistory, mergeBatchJobs } from './historyEntries';

/**
 * Журнал для людей: задачи одной пачки (по 10 серверов) склеиваются в одну строку
 * «24 сервера · работают 12 из 24 · ◈ 5 120», одиночные задачи остаются как есть.
 */

const target = (key: string, uuid = `u-${key}`): TargetOut => ({
  kind: 'host',
  label: key,
  address: key,
  port: 443,
  target_key: `${key}:443`,
  sni: null,
  ref: { host_uuid: uuid },
  purpose: 'regular',
});
const leg = (key: string, verdict: Leg['verdict']): Leg =>
  ({ id: 1, target_key: `${key}:443`, op_key: 'mts|цфо|on', operator: 'mts', verdict }) as Leg;
const job = (over: Partial<Job>): Job =>
  ({
    id: 1,
    kind: 'probe',
    status: 'done',
    targets: [],
    legs: [],
    units_effective: ['mts|цфо|on', 'tele2|цфо|on'],
    units_resolved: null,
    units_requested: null,
    cost_kopeks: 100,
    refunded_kopeks: 0,
    estimate_is_exact: true,
    error_message: null,
    result: null,
    started_at: '2026-09-07T10:00:00Z',
    created_at: '2026-09-07T10:00:00Z',
    batch_id: null,
    ...over,
  }) as Job;

describe('groupHistory', () => {
  it('склеивает задачи пачки по batch_id даже через чужую задачу, порядок — по первой', () => {
    const entries = groupHistory([
      job({ id: 3, batch_id: 7 }),
      job({ id: 2 }),
      job({ id: 1, batch_id: 7 }),
    ]);
    expect(entries.map((entry) => entry.key)).toEqual(['batch-7', 'job-2']);
    expect(entries[0].kind === 'batch' && entries[0].jobs.map((j) => j.id)).toEqual([3, 1]);
  });
});

describe('batchSummary', () => {
  const jobs = [
    job({
      id: 1,
      batch_id: 7,
      targets: [target('a'), target('b')],
      legs: [
        leg('a', 'reachable'),
        leg('a', 'reachable'),
        leg('b', 'blocked'),
        leg('b', 'reachable'),
      ],
      cost_kopeks: 1_000,
      started_at: '2026-09-07T10:05:00Z',
    }),
    job({
      id: 2,
      batch_id: 7,
      targets: [target('c')],
      legs: [leg('c', 'blocked')],
      cost_kopeks: 500,
      started_at: '2026-09-07T10:00:00Z',
    }),
  ];

  it('считает серверы словами: работают, не у всех, не работают; цена суммой; время — самое раннее', () => {
    expect(batchSummary(jobs)).toEqual({
      targets: 3,
      ok: 1,
      partial: 1,
      down: 1,
      status: 'done',
      tone: 'warn',
      costKopeks: 1_500,
      units: 2,
      startedAt: '2026-09-07T10:00:00Z',
    });
  });

  it('идущая задача делает пачку идущей, все отменённые — отменённой', () => {
    expect(batchSummary([jobs[0], job({ id: 3, batch_id: 7, status: 'running' })])).toMatchObject({
      status: 'pending',
      tone: 'pending',
    });
    expect(batchSummary([job({ id: 4, status: 'cancelled', cost_kopeks: null })])).toMatchObject({
      status: 'cancelled',
      tone: 'na',
      costKopeks: null,
    });
  });

  it('mergeBatchJobs собирает одну задачу для результата: все цели, все леги, сумма', () => {
    const merged = mergeBatchJobs(jobs);
    expect(merged.targets.map((t) => t.target_key)).toEqual(['a:443', 'b:443', 'c:443']);
    expect(merged.legs).toHaveLength(5);
    expect(merged.cost_kopeks).toBe(1_500);
    expect(merged.status).toBe('done');
    expect(jobs[0].targets).toHaveLength(2);
  });
});
