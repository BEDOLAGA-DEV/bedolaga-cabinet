import { describe, expect, it } from 'vitest';
import type { Job, Leg } from '@/api/reachability';
import { resultHeadline } from './resultHeadline';

/** Первая строка результата и строки журнала — ответ словами, а не таблица. */

const leg = (op_key: string, verdict: Leg['verdict']): Leg =>
  ({ id: 1, op_key, operator: op_key.split('|')[0], verdict, raw: null }) as unknown as Leg;
const job = (patch: Partial<Job>): Job =>
  ({ kind: 'probe', status: 'done', legs: [], result: null, ...patch }) as unknown as Job;

describe('resultHeadline', () => {
  it('все симки открывают — «везде»', () => {
    expect(
      resultHeadline(
        job({ legs: [leg('mts|цфо|on', 'reachable'), leg('tele2|цфо|on', 'reachable')] }),
      ),
    ).toEqual({ key: 'all', tone: 'ok', ok: 2, total: 2, blocked: [] });
  });

  it('часть режется — «у N из M», с перечнем режущих симок', () => {
    const headline = resultHeadline(
      job({
        legs: [
          leg('mts|цфо|on', 'reachable'),
          leg('tele2|уфо|on', 'blocked'),
          leg('yota|цфо|on', 'down'),
        ],
      }),
    );
    expect(headline).toEqual({
      key: 'partial',
      tone: 'warn',
      ok: 1,
      total: 3,
      blocked: ['tele2|уфо|on', 'yota|цфо|on'],
    });
  });

  it('нигде не открывается, ошибка, отмена, идёт, скан', () => {
    expect(resultHeadline(job({ legs: [leg('mts|цфо|on', 'blocked')] })).key).toBe('none');
    expect(resultHeadline(job({ status: 'failed' })).key).toBe('failed');
    expect(resultHeadline(job({ status: 'cancelled' })).key).toBe('cancelled');
    expect(resultHeadline(job({ status: 'running' })).key).toBe('pending');
    expect(
      resultHeadline(
        job({ kind: 'scan', result: { status: { result: { up_n: 3, total: 256 } } } }),
      ),
    ).toEqual({ key: 'scan', tone: 'ok', ok: 3, total: 256, blocked: [] });
    expect(resultHeadline(job({ legs: [] })).key).toBe('empty');
  });

  it('отменённые леги не считаются', () => {
    const headline = resultHeadline(
      job({ legs: [leg('mts|цфо|on', 'reachable'), leg('tele2|цфо|on', 'cancelled')] }),
    );
    expect([headline.key, headline.ok, headline.total]).toEqual(['all', 1, 1]);
  });

  it('по одной цели: считаются только её леги', () => {
    const legs = [
      { ...leg('mts|цфо|on', 'reachable'), target_key: 'a' },
      { ...leg('tele2|цфо|on', 'blocked'), target_key: 'a' },
      { ...leg('mts|цфо|on', 'blocked'), target_key: 'b' },
    ] as Leg[];
    expect(resultHeadline(job({ legs }), 'a')).toMatchObject({ key: 'partial', ok: 1, total: 2 });
    expect(resultHeadline(job({ legs }), 'b')).toMatchObject({ key: 'none', ok: 0, total: 1 });
  });
});
