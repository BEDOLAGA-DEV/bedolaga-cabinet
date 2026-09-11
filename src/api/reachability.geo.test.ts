import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({
  get: vi.fn(async () => ({
    data: {
      networks: ['res', 'mob'],
      districts: [],
      regions: [],
      isps: [],
      cities: [],
      cities_total: 0,
      cities_truncated: false,
    },
  })),
}));
vi.mock('./client', () => ({ default: { get, post: vi.fn(), put: vi.fn() } }));

import { reachabilityApi } from './reachability';

describe('reachabilityApi.getGeoCatalog', () => {
  it('ходит в geo/catalog с фильтрами как есть и отдаёт справочник', async () => {
    const catalog = await reachabilityApi.getGeoCatalog({
      network: 'res',
      q: 'воронеж',
      district: 'cfo',
    });
    expect(get).toHaveBeenCalledWith('/cabinet/admin/reachability/geo/catalog', {
      params: { network: 'res', q: 'воронеж', district: 'cfo' },
    });
    expect(catalog.networks).toEqual(['res', 'mob']);
  });
});
