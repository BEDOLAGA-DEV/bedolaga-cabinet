import { describe, expect, it } from 'vitest';
import { buildReachabilityLink, jobKindOf, parseReachabilityDeepLink } from './deepLink';

/**
 * `?kind=hosts|ip|cidr|vless&target=host:<uuid>&user=<id>&sub=<shortUuid>&job=<id>`.
 * Вкладки как в оригинале bsbord.com: хосты панели, IP / домен, CIDR, подписка.
 * Старые значения `probe` и `scan` из сохранённых ссылок продолжают открывать нужную вкладку.
 */

describe('parseReachabilityDeepLink', () => {
  it('по умолчанию — хосты панели без целей', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams(''))).toEqual({
      mode: 'hosts',
      targets: [],
      userId: null,
      shortUuid: null,
      jobId: null,
      repeatJobId: null,
      runningJobId: null,
      serverKey: null,
      batchId: null,
    });
  });

  it('четыре вкладки; старые probe и scan сводятся к hosts и cidr', () => {
    for (const mode of ['hosts', 'ip', 'cidr', 'vless']) {
      expect(parseReachabilityDeepLink(new URLSearchParams(`kind=${mode}`)).mode).toBe(mode);
    }
    expect(parseReachabilityDeepLink(new URLSearchParams('kind=probe')).mode).toBe('hosts');
    expect(parseReachabilityDeepLink(new URLSearchParams('kind=scan')).mode).toBe('cidr');
  });

  it('target=host:<uuid> открывает хосты с целью, параметр повторяемый', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('target=host:h-1&target=node:n-2'));
    expect(link.mode).toBe('hosts');
    expect(link.targets).toEqual([
      { kind: 'host', ref: 'h-1' },
      { kind: 'node', ref: 'n-2' },
    ]);
  });

  it('user= или sub= ведут на подписку, мусор игнорируется', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams('kind=vless&user=15'))).toMatchObject({
      mode: 'vless',
      userId: 15,
    });
    expect(parseReachabilityDeepLink(new URLSearchParams('user=15')).mode).toBe('vless');
    expect(parseReachabilityDeepLink(new URLSearchParams('user=abc')).userId).toBeNull();
    expect(parseReachabilityDeepLink(new URLSearchParams('sub=abc')).shortUuid).toBe('abc');
  });

  it('job= раскрывает задачу в «моих проверках»', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams('job=42')).jobId).toBe(42);
    expect(parseReachabilityDeepLink(new URLSearchParams('job=x')).jobId).toBeNull();
  });

  it('неизвестная вкладка и неизвестный вид цели отбрасываются', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('kind=teapot&target=cidr:1.2.3.0'));
    expect(link.mode).toBe('hosts');
    expect(link.targets).toEqual([]);
    expect(parseReachabilityDeepLink(new URLSearchParams('target=host:')).targets).toEqual([]);
  });

  it('buildReachabilityLink собирает обратную ссылку', () => {
    expect(buildReachabilityLink({ targets: [{ kind: 'node', ref: 'n-1' }] })).toBe(
      '/admin/reachability?kind=hosts&target=node%3An-1',
    );
    expect(buildReachabilityLink({ mode: 'vless', userId: 7 })).toBe(
      '/admin/reachability?kind=vless&user=7',
    );
    expect(buildReachabilityLink({ shortUuid: 's-1' })).toBe(
      '/admin/reachability?kind=vless&sub=s-1',
    );
    expect(buildReachabilityLink({ jobId: 5 })).toBe('/admin/reachability?kind=hosts&job=5');
    expect(buildReachabilityLink({})).toBe('/admin/reachability?kind=hosts');
  });

  it('разбор обратен сборке', () => {
    const link = buildReachabilityLink({ targets: [{ kind: 'host', ref: 'h:1' }], userId: 3 });
    const parsed = parseReachabilityDeepLink(new URL(link, 'https://x').searchParams);
    expect(parsed).toEqual({
      mode: 'hosts',
      targets: [{ kind: 'host', ref: 'h:1' }],
      userId: 3,
      shortUuid: null,
      jobId: null,
      repeatJobId: null,
      runningJobId: null,
      serverKey: null,
      batchId: null,
    });
  });
});

describe('jobKindOf', () => {
  it('хосты и IP — одна и та же probe-задача бота, CIDR — скан', () => {
    expect(jobKindOf('hosts')).toBe('probe');
    expect(jobKindOf('ip')).toBe('probe');
    expect(jobKindOf('cidr')).toBe('scan');
    expect(jobKindOf('vless')).toBe('vless');
  });

  it('«Повторить»: ?repeat=<id> читается и пишется вместе с видом', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('kind=ip&repeat=12'));
    expect([link.mode, link.repeatJobId]).toEqual(['ip', 12]);
    expect(buildReachabilityLink({ mode: 'ip', repeatJobId: 12 })).toBe(
      '/admin/reachability?kind=ip&repeat=12',
    );
  });

  it('идущая проверка живёт в адресе: ?running=<id>', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams('running=15')).runningJobId).toBe(15);
    expect(buildReachabilityLink({ runningJobId: 15 })).toBe(
      '/admin/reachability?kind=hosts&running=15',
    );
  });
});
