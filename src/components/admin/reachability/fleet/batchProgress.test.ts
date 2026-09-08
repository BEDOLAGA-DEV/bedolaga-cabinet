import { describe, expect, it } from 'vitest';
import type { Batch } from '@/api/reachability';
import {
  batchEtaMinutes,
  batchTargets,
  estimateBatchMinutes,
  isBatchActive,
  spentSoFar,
} from './batchProgress';

/** Прогресс пачки по целям из частичных результатов идущих проб. */

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
            target: 'B.EXAMPLE:443',
            operator: 'tele2',
            region: 'ЦФО',
            dpi: 'on',
            state: 'done',
            verdict: 'blocked',
            latency_ms: null,
          },
          {
            target: 'c.example',
            operator: 'mts',
            region: 'ЦФО',
            dpi: 'on',
            state: 'running',
            verdict: null,
            latency_ms: null,
          },
          {
            target: 'c.example',
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

describe('batchTargets', () => {
  it('maps jobs and partial legs to per-target progress', () => {
    const map = batchTargets(batch);
    expect(map.get('a.example:443')).toEqual({ state: 'done', ok: 0, total: 0, done: 0 });
    expect(map.get('b.example:443')).toEqual({ state: 'checking', ok: 1, total: 2, done: 2 });
    expect(map.get('c.example:443')).toEqual({ state: 'checking', ok: 0, total: 2, done: 0 });
    expect(map.get('d.example:443')).toEqual({ state: 'queued', ok: 0, total: 0, done: 0 });
  });

  it('marks a running job without partial as checking', () => {
    const map = batchTargets({
      ...batch,
      jobs: [
        {
          id: 1,
          status: 'running',
          phase: 'waiting',
          target_keys: ['x:1'],
          cost_kopeks: null,
          partial: null,
        },
      ],
    });
    expect(map.get('x:1')).toEqual({ state: 'checking', ok: 0, total: 0, done: 0 });
  });
});

describe('money, eta, activity', () => {
  it('sums spent kopeks over jobs with a price', () => {
    expect(spentSoFar(batch)).toBe(640);
    expect(spentSoFar({ ...batch, jobs: [] })).toBe(0);
  });

  it('estimates remaining minutes from the done share, at least one', () => {
    expect(batchEtaMinutes(batch, 15)).toBe(10);
    expect(batchEtaMinutes({ ...batch, done_targets: 0 }, 15)).toBe(15);
    expect(batchEtaMinutes({ ...batch, done_targets: 3 }, 15)).toBe(1);
    expect(batchEtaMinutes(batch, null)).toBeNull();
  });

  it('tells whether the batch still runs', () => {
    expect(isBatchActive(batch)).toBe(true);
    expect(isBatchActive({ ...batch, status: 'done' })).toBe(false);
    expect(isBatchActive(null)).toBe(false);
  });
});

describe('estimateBatchMinutes', () => {
  it('mirrors the bot: 15 minutes per round of three chunks of ten', () => {
    expect(estimateBatchMinutes(12)).toBe(15);
    expect(estimateBatchMinutes(100)).toBe(60);
    expect(estimateBatchMinutes(1, 1)).toBeGreaterThanOrEqual(1);
  });
});
