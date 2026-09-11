import { beforeEach, describe, expect, it } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';
import { DEFAULT_GEO_FORM, recallGeoForm, rememberGeoForm, toGeoOptions } from './geoForm';
import { buildGeoBody } from './jobBodies';

beforeEach(() => resetSafeStorage());

describe('geoForm', () => {
  it('значения по умолчанию как у оригинала: проводной, вся РФ, любой провайдер, TLS, без тяжёлой', () => {
    expect(toGeoOptions(DEFAULT_GEO_FORM)).toEqual({
      network: 'res',
      scope: { kind: 'all' },
      isp: null,
      city_limit: 0,
      probe_mode: 'tls',
      heavy: false,
    });
  });
  it('охват уходит только выбранного вида; города — списком с провайдером', () => {
    const state = {
      ...DEFAULT_GEO_FORM,
      scopeKind: 'cities' as const,
      district: 'cfo',
      region: 'moscow',
      cities: [{ region: 'moscow', city: 'moscow', isp: 'mts' }],
      isp: '__ALL__',
      cityLimit: 30,
    };
    expect(toGeoOptions(state).scope).toEqual({
      kind: 'cities',
      cities: [{ region: 'moscow', city: 'moscow', isp: 'mts' }],
    });
    expect(toGeoOptions({ ...state, scopeKind: 'district' }).scope).toEqual({
      kind: 'district',
      district: 'cfo',
    });
    expect(toGeoOptions({ ...state, scopeKind: 'region' }).scope).toEqual({
      kind: 'region',
      region: 'moscow',
    });
    expect(toGeoOptions(state).isp).toBe('__ALL__');
    expect(toGeoOptions(state).city_limit).toBe(30);
  });
  it('охват без выбранного значения сводится к «вся РФ», «каждый провайдер» при этом снимается', () => {
    const options = toGeoOptions({ ...DEFAULT_GEO_FORM, scopeKind: 'district', isp: '__ALL__' });
    expect(options.scope).toEqual({ kind: 'all' });
    expect(options.isp).toBeNull();
  });
  it('тяжёлая проба в TCP не уходит', () => {
    expect(toGeoOptions({ ...DEFAULT_GEO_FORM, probeMode: 'tcp', heavy: true }).heavy).toBe(false);
  });
  it('память формы: без записи — null; после записи — те же поля, кроме списка городов', () => {
    expect(recallGeoForm()).toBeNull();
    rememberGeoForm({
      ...DEFAULT_GEO_FORM,
      network: 'mob',
      scopeKind: 'district',
      district: 'pfo',
      probeMode: 'tcp',
      cities: [{ region: 'x', city: 'y', label: 'Игрек · Икс' }],
    });
    expect(recallGeoForm()).toEqual({
      ...DEFAULT_GEO_FORM,
      network: 'mob',
      scopeKind: 'district',
      district: 'pfo',
      probeMode: 'tcp',
      cities: [],
    });
  });
});

describe('buildGeoBody', () => {
  const selection = {
    hosts: ['h-1'],
    custom: ['example.com'],
    config: { kind: 'subscription_config' as const, short_uuid: 'ref-1', index: 0 },
    core: '' as const,
  };
  const expected = (targets: unknown[], form = DEFAULT_GEO_FORM) => ({
    kind: 'geo',
    targets,
    units: [],
    dpi: 'any',
    probes: { icmp: false, tcp: false, sni: false },
    core: '',
    sni_hosts: [],
    geo: toGeoOptions(form),
  });
  it('в тело уходят цели только выбранного вида — хосты, адреса или один конфиг', () => {
    expect(buildGeoBody({ ...selection, form: DEFAULT_GEO_FORM })).toEqual(
      expected([{ kind: 'host', ref: 'h-1' }]),
    );
    const addresses = { ...DEFAULT_GEO_FORM, targetKind: 'addresses' as const };
    expect(buildGeoBody({ ...selection, form: addresses })).toEqual(
      expected([{ kind: 'custom', value: 'example.com' }], addresses),
    );
    const vless = { ...DEFAULT_GEO_FORM, targetKind: 'vless' as const };
    expect(buildGeoBody({ ...selection, form: vless })).toEqual(
      expected([{ kind: 'subscription_config', short_uuid: 'ref-1', index: 0 }], vless),
    );
  });
  it('без целей выбранного вида — null, даже если другие виды заполнены', () => {
    expect(buildGeoBody({ ...selection, hosts: [], form: DEFAULT_GEO_FORM })).toBeNull();
    expect(
      buildGeoBody({ hosts: [], custom: [], config: null, form: DEFAULT_GEO_FORM, core: '' }),
    ).toBeNull();
  });
});
