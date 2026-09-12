import { describe, expect, it } from 'vitest';
import type { Job } from '@/api/reachability';
import { canRepeat, repeatFromJob } from './repeatFromJob';

/** «Повторить» в журнале: из задачи собирается состояние формы запуска — те же цели, симки, пробы. */

const base = {
  units_requested: ['mts|цфо|on', 'tele2|цфо|on'],
  probes: { icmp: true, tcp: true, sni: false },
  sni_hosts: ['ads.x5.ru'],
} as unknown as Job;

describe('repeatFromJob', () => {
  it('GEO: вкладка geo, хосты и адреса — как у проверки хостов', () => {
    const job = {
      ...base,
      kind: 'geo',
      targets: [
        { kind: 'host', ref: { host_uuid: 'h-1' }, target_key: 'a:443' },
        { kind: 'custom', ref: {}, target_key: 'example.com:443' },
      ],
    } as unknown as Job;
    expect(repeatFromJob(job)).toMatchObject({
      mode: 'geo',
      hosts: ['h-1'],
      addresses: 'example.com:443',
    });
    expect(canRepeat(job)).toBe(true);
  });

  it('проверка хостов: ссылки на хосты и ноды, симки, пробы, SNI', () => {
    const job = {
      ...base,
      kind: 'probe',
      targets: [
        { kind: 'host', ref: { host_uuid: 'h-1' }, target_key: 'a:443' },
        { kind: 'node', ref: { node_uuid: 'n-1' }, target_key: '10.0.0.1' },
      ],
    } as unknown as Job;
    expect(repeatFromJob(job)).toEqual({
      mode: 'hosts',
      hosts: ['h-1'],
      nodes: ['n-1'],
      addresses: '',
      cidr: '',
      shortUuid: null,
      configIndexes: [],
      units: ['mts|цфо|on', 'tele2|цфо|on'],
      probes: { icmp: true, tcp: true, sni: false },
      sniHosts: 'ads.x5.ru',
    });
  });

  it('свои адреса: текст поля из целей построчно', () => {
    const job = {
      ...base,
      kind: 'probe',
      targets: [
        { kind: 'custom', ref: {}, target_key: 'ya.ru', address: 'ya.ru', port: null },
        { kind: 'custom', ref: {}, target_key: '1.1.1.1:443', address: '1.1.1.1', port: 443 },
      ],
    } as unknown as Job;
    const state = repeatFromJob(job);
    expect([state.mode, state.addresses]).toEqual(['ip', 'ya.ru\n1.1.1.1:443']);
  });

  it('скан и подписка', () => {
    const scan = {
      ...base,
      kind: 'scan',
      targets: [{ kind: 'cidr', ref: {}, target_key: '192.0.2.0/24' }],
    } as unknown as Job;
    expect(repeatFromJob(scan)).toMatchObject({ mode: 'cidr', cidr: '192.0.2.0/24' });
    const vless = {
      ...base,
      kind: 'vless',
      targets: [
        {
          kind: 'subscription_config',
          ref: { short_uuid: 'ref-1', index: 2 },
          target_key: 'x:443',
        },
        {
          kind: 'subscription_config',
          ref: { short_uuid: 'ref-1', index: 4 },
          target_key: 'y:443',
        },
      ],
    } as unknown as Job;
    expect(repeatFromJob(vless)).toMatchObject({
      mode: 'vless',
      shortUuid: 'ref-1',
      configIndexes: [2, 4],
    });
  });
});

describe('canRepeat', () => {
  it('VPN-тест по вставленным ссылкам не повторить: ссылок в задаче нет', () => {
    expect(canRepeat({ kind: 'vless', targets: [{ kind: 'custom' }] } as unknown as Job)).toBe(
      false,
    );
    expect(
      canRepeat({ kind: 'vless', targets: [{ kind: 'subscription_config' }] } as unknown as Job),
    ).toBe(true);
    expect(canRepeat({ kind: 'probe', targets: [{ kind: 'custom' }] } as unknown as Job)).toBe(
      true,
    );
  });
});
