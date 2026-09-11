import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/reachability';
import { canRecheck, recheckLink } from './recheckLinks';

const job = { id: 44, kind: 'geo', status: 'done', targets: [] } as unknown as Job;
const row = {
  region: 'tyumen_oblast',
  city: 'tyumen',
  req_isp: null,
  sid: 's-1',
  exit_ip: '109.248.255.118',
};

describe('recheckLinks', () => {
  it('перепроверить можно завершённую задачу GEO; идущую и другие виды — нет', () => {
    expect(canRecheck(job)).toBe(true);
    expect(canRecheck({ ...job, status: 'cancelled' })).toBe(true);
    expect(canRecheck({ ...job, status: 'running' })).toBe(false);
    expect(canRecheck({ ...job, kind: 'probe' })).toBe(false);
  });
  it('«ещё раз» — ссылка на GEO с тем же прогоном и одним городом; «тот же IP» добавляет сессию', () => {
    expect(recheckLink(job, row)).toBe(
      '/admin/reachability?kind=geo&repeat=44&city=tyumen_oblast%7Ctyumen',
    );
    expect(recheckLink(job, { ...row, req_isp: 'mts' })).toContain('&isp=mts');
    expect(recheckLink(job, row, true)).toContain('&session=s-1&exit=109.248.255.118');
    expect(recheckLink(job, { ...row, sid: null }, true)).toBeNull();
    expect(recheckLink({ ...job, status: 'running' }, row)).toBeNull();
  });
});
