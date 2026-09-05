import { describe, expect, it } from 'vitest';
import { buildReachabilityLink, parseReachabilityDeepLink } from './deepLink';

/** `?kind=probe|vless|scan&target=host:<uuid>&user=<id>&sub=<shortUuid>&job=<id>` */

describe('parseReachabilityDeepLink', () => {
  it('по умолчанию — проверка хостов без целей', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams(''))).toEqual({
      kind: 'probe',
      targets: [],
      userId: null,
      shortUuid: null,
      jobId: null,
    });
  });

  it('target=host:<uuid> открывает проверку с целью, параметр повторяемый', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('target=host:h-1&target=node:n-2'));
    expect(link.kind).toBe('probe');
    expect(link.targets).toEqual([
      { kind: 'host', ref: 'h-1' },
      { kind: 'node', ref: 'n-2' },
    ]);
  });

  it('user= или sub= ведут на подписку, мусор игнорируется', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams('kind=vless&user=15'))).toMatchObject({
      kind: 'vless',
      userId: 15,
    });
    expect(parseReachabilityDeepLink(new URLSearchParams('user=15')).kind).toBe('vless');
    expect(parseReachabilityDeepLink(new URLSearchParams('user=abc')).userId).toBeNull();
    expect(parseReachabilityDeepLink(new URLSearchParams('sub=abc')).shortUuid).toBe('abc');
  });

  it('job= раскрывает задачу в «моих проверках»', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams('job=42')).jobId).toBe(42);
    expect(parseReachabilityDeepLink(new URLSearchParams('job=x')).jobId).toBeNull();
  });

  it('неизвестный вид и неизвестный вид цели отбрасываются', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('kind=teapot&target=cidr:1.2.3.0'));
    expect(link.kind).toBe('probe');
    expect(link.targets).toEqual([]);
    expect(parseReachabilityDeepLink(new URLSearchParams('target=host:')).targets).toEqual([]);
  });

  it('buildReachabilityLink собирает обратную ссылку', () => {
    expect(buildReachabilityLink({ targets: [{ kind: 'node', ref: 'n-1' }] })).toBe(
      '/admin/reachability?kind=probe&target=node%3An-1',
    );
    expect(buildReachabilityLink({ kind: 'vless', userId: 7 })).toBe(
      '/admin/reachability?kind=vless&user=7',
    );
    expect(buildReachabilityLink({ shortUuid: 's-1' })).toBe(
      '/admin/reachability?kind=vless&sub=s-1',
    );
    expect(buildReachabilityLink({ jobId: 5 })).toBe('/admin/reachability?kind=probe&job=5');
    expect(buildReachabilityLink({})).toBe('/admin/reachability?kind=probe');
  });

  it('разбор обратен сборке', () => {
    const link = buildReachabilityLink({ targets: [{ kind: 'host', ref: 'h:1' }], userId: 3 });
    const parsed = parseReachabilityDeepLink(new URL(link, 'https://x').searchParams);
    expect(parsed).toEqual({
      kind: 'probe',
      targets: [{ kind: 'host', ref: 'h:1' }],
      userId: 3,
      shortUuid: null,
      jobId: null,
    });
  });
});
