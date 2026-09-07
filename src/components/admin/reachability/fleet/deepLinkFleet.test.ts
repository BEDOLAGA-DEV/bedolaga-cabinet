import { describe, expect, it } from 'vitest';
import { buildReachabilityLink, parseReachabilityDeepLink } from '../deepLink';

/** Адрес страницы флота помнит открытый сервер, идущую пачку и режим выбора вручную. */

describe('fleet deep link', () => {
  it('parses and builds server, batch and pick', () => {
    const link = parseReachabilityDeepLink(
      new URLSearchParams('server=bs.example%3A9443&batch=7&pick=1'),
    );
    expect([link.serverKey, link.batchId, link.picking]).toEqual(['bs.example:9443', 7, true]);
    const url = buildReachabilityLink({ serverKey: 'bs.example:9443', batchId: 7, picking: true });
    expect(url).toContain('server=bs.example%3A9443');
    expect(url).toContain('batch=7');
    expect(url).toContain('pick=1');
  });

  it('defaults to nothing open', () => {
    const link = parseReachabilityDeepLink(new URLSearchParams(''));
    expect([link.serverKey, link.batchId, link.picking]).toEqual([null, null, false]);
    expect(buildReachabilityLink({})).not.toContain('pick');
  });
});
