import { describe, expect, it } from 'vitest';
import {
  buildProbeBody,
  buildScanBody,
  buildVlessBody,
  cidrFromAddress,
  isCidr24,
} from './jobBodies';

const PROBES = { icmp: false, tcp: true, sni: true };

describe('buildProbeBody', () => {
  it('собирает цели трёх видов и включает ICMP при нодах', () => {
    const body = buildProbeBody({
      hosts: ['h-1'],
      nodes: ['n-1'],
      custom: ['1.1.1.1'],
      units: ['mts'],
      dpi: 'on',
      probes: PROBES,
      sniHosts: ['ads.x5.ru'],
    });
    expect(body).toEqual({
      kind: 'probe',
      targets: [
        { kind: 'host', ref: 'h-1' },
        { kind: 'node', ref: 'n-1' },
        { kind: 'custom', value: '1.1.1.1' },
      ],
      units: ['mts'],
      dpi: 'on',
      probes: { icmp: true, tcp: true, sni: true },
      core: '',
      sni_hosts: ['ads.x5.ru'],
    });
  });

  it('без SNI-пробы свои имена не уходят', () => {
    const body = buildProbeBody({
      hosts: ['h-1'],
      nodes: [],
      custom: [],
      units: [],
      dpi: 'on',
      probes: { icmp: true, tcp: true, sni: false },
      sniHosts: ['ads.x5.ru'],
    });
    expect(body?.sni_hosts).toEqual([]);
  });

  it('без целей — null; без нод ICMP не навязывается', () => {
    expect(
      buildProbeBody({
        hosts: [],
        nodes: [],
        custom: [],
        units: [],
        dpi: 'on',
        probes: PROBES,
        sniHosts: [],
      }),
    ).toBeNull();
    const body = buildProbeBody({
      hosts: ['h'],
      nodes: [],
      custom: [],
      units: [],
      dpi: 'off',
      probes: PROBES,
      sniHosts: [],
    });
    expect(body?.probes.icmp).toBe(false);
  });
});

describe('buildVlessBody', () => {
  it('готовые цели как есть, ядро из селекта, пробы выключены', () => {
    const targets = [
      { kind: 'subscription_config' as const, short_uuid: 's-1', index: 2 },
      { kind: 'custom' as const, value: 'vless://u@h.example:443#x' },
    ];
    const body = buildVlessBody({ targets, units: [], dpi: 'any', core: 'stable' });
    expect(body?.targets).toEqual(targets);
    expect(body?.core).toBe('stable');
    expect(body?.probes).toEqual({ icmp: false, tcp: false, sni: false });
    expect(body?.sni_hosts).toEqual([]);
  });

  it('без выбранных конфигов — null', () => {
    expect(buildVlessBody({ targets: [], units: [], dpi: 'on', core: '' })).toBeNull();
  });
});

describe('buildScanBody / cidr', () => {
  it('скан — одна цель cidr, только при валидной /24', () => {
    const body = buildScanBody({
      cidr: ' 192.0.2.0/24 ',
      units: ['dobro|цфо|on'],
      dpi: 'on',
      probes: { icmp: true, tcp: true, sni: false },
      sniHosts: ['ads.x5.ru'],
    });
    expect(body?.targets).toEqual([{ kind: 'cidr', value: '192.0.2.0/24' }]);
    expect(body?.sni_hosts).toEqual([]);
    const withSni = buildScanBody({
      cidr: '192.0.2.0/24',
      units: [],
      dpi: 'on',
      probes: PROBES,
      sniHosts: ['ads.x5.ru'],
    });
    expect(withSni?.sni_hosts).toEqual(['ads.x5.ru']);
    expect(
      buildScanBody({ cidr: '192.0.2.0/23', units: [], dpi: 'on', probes: PROBES, sniHosts: [] }),
    ).toBeNull();
    expect(
      buildScanBody({ cidr: '', units: [], dpi: 'on', probes: PROBES, sniHosts: [] }),
    ).toBeNull();
  });

  it('isCidr24 и подсеть из адреса хоста', () => {
    expect(isCidr24('8.8.8.77/24')).toBe(true);
    expect(isCidr24('8.8.8.0')).toBe(false);
    expect(isCidr24('example.com/24')).toBe(false);
    expect(cidrFromAddress('192.0.2.142')).toBe('192.0.2.0/24');
    expect(cidrFromAddress('eu-host.example')).toBeNull();
    expect(cidrFromAddress('2001:db8::1')).toBeNull();
  });
});
