import { beforeEach, describe, expect, it } from 'vitest';
import { resetSafeStorage } from '@/utils/safeStorage';
import { DEFAULT_GEO_FORM, recallGeoForm, rememberGeoForm, toGeoOptions } from './geoScope';
import { buildGeoBody } from './jobBodies';

beforeEach(() => resetSafeStorage());

describe('geoScope', () => {
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
      cities: [{ region: 'x', city: 'y' }],
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
  it('хосты, адреса и один конфиг — в одном теле, симок нет, вид geo', () => {
    const body = buildGeoBody({
      hosts: ['h-1'],
      custom: ['example.com'],
      config: { kind: 'subscription_config', short_uuid: 'ref-1', index: 0 },
      form: DEFAULT_GEO_FORM,
      core: '',
    });
    expect(body).toEqual({
      kind: 'geo',
      targets: [
        { kind: 'host', ref: 'h-1' },
        { kind: 'custom', value: 'example.com' },
        { kind: 'subscription_config', short_uuid: 'ref-1', index: 0 },
      ],
      units: [],
      dpi: 'any',
      probes: { icmp: false, tcp: false, sni: false },
      core: '',
      sni_hosts: [],
      geo: toGeoOptions(DEFAULT_GEO_FORM),
    });
  });
  it('без целей — null', () => {
    expect(
      buildGeoBody({ hosts: [], custom: [], config: null, form: DEFAULT_GEO_FORM, core: '' }),
    ).toBeNull();
  });
});
