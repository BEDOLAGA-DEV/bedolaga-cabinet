import { describe, expect, it } from 'vitest';
import { hasUnknownManagedTraffic } from './trafficAccounting';

describe('managed traffic availability', () => {
  it('never derives availability from neutral compatibility counters', () => {
    expect(
      hasUnknownManagedTraffic({ traffic_accounting_mode: 'managed', traffic_remaining_gb: null }),
    ).toBe(true);
    expect(
      hasUnknownManagedTraffic({ traffic_accounting_mode: 'managed', traffic_remaining_gb: 0 }),
    ).toBe(false);
    expect(
      hasUnknownManagedTraffic({ traffic_accounting_mode: 'legacy', traffic_remaining_gb: null }),
    ).toBe(false);
  });
  it('an explicit refreshed null supersedes the old known balance', () => {
    expect(
      hasUnknownManagedTraffic(
        { traffic_accounting_mode: 'managed', traffic_remaining_gb: 80 },
        { traffic_remaining_gb: null },
      ),
    ).toBe(true);
  });
});
