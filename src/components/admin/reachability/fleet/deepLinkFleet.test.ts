import { describe, expect, it } from 'vitest';
import { buildReachabilityLink, parseReachabilityDeepLink } from '../deepLink';

/** Адрес страницы флота помнит открытый сервер и идущую пачку. */

describe('fleet deep link', () => {
  it('parses and builds server and batch', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams('server=bs.example%3A9443&batch=7'));
    expect([link.serverKey, link.batchId]).toEqual(['bs.example:9443', 7]);
    const url = buildReachabilityLink({ serverKey: 'bs.example:9443', batchId: 7 });
    expect(url).toContain('server=bs.example%3A9443');
    expect(url).toContain('batch=7');
  });

  it('defaults to nothing open', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams(''));
    expect([link.serverKey, link.batchId]).toEqual([null, null]);
    expect(buildReachabilityLink({})).not.toContain('pick');
  });
});
