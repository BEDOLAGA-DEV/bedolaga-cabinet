import { describe, expect, it } from 'vitest';
import { buildReachabilityLink, parseReachabilityDeepLink } from './deepLink';

describe('parseReachabilityDeepLink', () => {
  it('по умолчанию — сводка без целей', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams(''))).toEqual({
      tab: 'summary',
      targets: [],
      userId: null,
      shortUuid: null,
    });
  });

  it('target=host:<uuid> открывает проверку с целью, параметр повторяемый', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('target=host:h-1&target=node:n-2'));
    expect(link.tab).toBe('probe');
    expect(link.targets).toEqual([
      { kind: 'host', ref: 'h-1' },
      { kind: 'node', ref: 'n-2' },
    ]);
  });

  it('user= ведёт на VLESS-тест, мусор в user игнорируется', () => {
    expect(parseReachabilityDeepLink(new URLSearchParams('tab=vless&user=15'))).toMatchObject({
      tab: 'vless',
      userId: 15,
    });
    expect(parseReachabilityDeepLink(new URLSearchParams('user=15')).tab).toBe('vless');
    expect(parseReachabilityDeepLink(new URLSearchParams('user=abc')).userId).toBeNull();
    expect(parseReachabilityDeepLink(new URLSearchParams('sub=abc')).shortUuid).toBe('abc');
  });

  it('неизвестная вкладка и неизвестный вид цели отбрасываются', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('tab=teapot&target=cidr:1.2.3.0'));
    expect(link.tab).toBe('summary');
    expect(link.targets).toEqual([]);
    expect(parseReachabilityDeepLink(new URLSearchParams('target=host:')).targets).toEqual([]);
  });

  it('buildReachabilityLink собирает обратную ссылку', () => {
    expect(buildReachabilityLink({ targets: [{ kind: 'node', ref: 'n-1' }] })).toBe(
      '/admin/reachability?tab=probe&target=node%3An-1',
    );
    expect(buildReachabilityLink({ tab: 'vless', userId: 7 })).toBe(
      '/admin/reachability?tab=vless&user=7',
    );
    expect(buildReachabilityLink({ shortUuid: 's-1' })).toBe(
      '/admin/reachability?tab=vless&sub=s-1',
    );
    expect(buildReachabilityLink({})).toBe('/admin/reachability?tab=summary');
  });

  it('разбор обратен сборке', () => {
    const link = buildReachabilityLink({ targets: [{ kind: 'host', ref: 'h:1' }], userId: 3 });
    const parsed = parseReachabilityDeepLink(new URL(link, 'https://x').searchParams);
    expect(parsed).toEqual({
      tab: 'probe',
      targets: [{ kind: 'host', ref: 'h:1' }],
      userId: 3,
      shortUuid: null,
    });
  });
});
