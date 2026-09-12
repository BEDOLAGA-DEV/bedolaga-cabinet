import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/reachability';
import {
  holdLeftSeconds,
  recheckButtons,
  recheckEntries,
  recheckKey,
  recheckState,
  runningRechecks,
} from './geoRecheck';

const t = (key: string, options?: Record<string, unknown>) =>
  `${key.split('.').pop()}${options ? ` ${JSON.stringify(options)}` : ''}`;
const finished = new Date('2026-09-11T10:00:00Z');
const job = { kind: 'geo', status: 'done', finished_at: finished.toISOString() } as unknown as Job;
const row = {
  region: 'r',
  city: 'c',
  req_isp: null,
  verdict: 'blocked',
  sid: 's-1',
  sid_hold_s: 300,
  exit_ip: '1.1.1.1',
};

describe('geoRecheck', () => {
  it('состояние как у оригинала: зелёная — ничего, проваленная — кнопки, идёт — busy, была — перепроверено', () => {
    expect(recheckState(job, { ...row, verdict: 'ok' }, new Set())).toBe('none');
    expect(recheckState(job, row, new Set())).toBe('buttons');
    expect(recheckState(job, row, new Set([recheckKey(row)]))).toBe('busy');
    expect(recheckState(job, { ...row, rechecked: true }, new Set())).toBe('rechecked');
    expect(recheckState({ ...job, status: 'running' }, row, new Set())).toBe('none');
    expect(recheckKey({ region: 'r', city: 'c', req_isp: 'mts' })).toBe('r|c|mts');
  });
  it('удержание выхода считается от конца прогона', () => {
    expect(holdLeftSeconds(job, row, finished.getTime() + 100_000)).toBe(200);
    expect(holdLeftSeconds(job, row, finished.getTime() + 400_000)).toBe(0);
    expect(holdLeftSeconds(job, { sid_hold_s: null }, finished.getTime())).toBeNull();
  });
  it('подписи кнопок: «тот же IP» с удержанием, « ?» когда истекло, без sid — выход заново', () => {
    const fresh = recheckButtons(job, row, t, finished.getTime() + 10_000);
    expect(fresh.map((b) => b.label)).toEqual(['sameIp', 'newIp']);
    expect(fresh[0].title).toBe('sameIpHold {"ip":"1.1.1.1","seconds":290}');
    expect(fresh[0].sameExit).toBe(true);
    expect(fresh[1].sameExit).toBe(false);
    const expired = recheckButtons(job, row, t, finished.getTime() + 400_000);
    expect(expired[0].label).toBe('sameIp ?');
    expect(expired[0].title).toBe('sameIpExpired {"ip":"1.1.1.1"}');
    const noSid = recheckButtons(job, { ...row, sid: null }, t);
    expect(noSid[0].label).toBe('sameIp');
    expect(noSid[0].title).toBe('sameIpNoSid');
  });
  it('записи повторов читаются из result.rechecks: занят только город «идёт», мусор пропускается', () => {
    const withEntries = {
      result: {
        rechecks: {
          'r|c|': { status: 'running', run_id: 812, started_at: '2026-09-11T10:00:00Z' },
          'r|d|': { status: 'failed', error: 'Прогон пропал на стороне сервиса' },
          'r|e|': 'мусор',
          'r|f|': { status: 'неизвестно' },
        },
      },
    } as unknown as Job;
    const entries = recheckEntries(withEntries);
    expect([...entries.keys()]).toEqual(['r|c|', 'r|d|']);
    expect(entries.get('r|c|')).toEqual({ status: 'running' });
    expect(entries.get('r|d|')).toEqual({
      status: 'failed',
      error: 'Прогон пропал на стороне сервиса',
    });
    expect([...runningRechecks(withEntries)]).toEqual(['r|c|']);
    expect(runningRechecks({ result: null } as Job).size).toBe(0);
    expect(recheckEntries({ result: { rechecks: 'мусор' } } as unknown as Job).size).toBe(0);
  });
});
