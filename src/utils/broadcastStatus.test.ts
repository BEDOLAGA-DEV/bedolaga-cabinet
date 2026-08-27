import { describe, expect, it } from 'vitest';
import { broadcastPollInterval, isBroadcastInFlight } from './broadcastStatus';

describe('broadcastStatus', () => {
  it('treats queued, in-progress and cancelling deliveries as running', () => {
    expect(isBroadcastInFlight('queued')).toBe(true);
    expect(isBroadcastInFlight('in_progress')).toBe(true);
    expect(isBroadcastInFlight('cancelling')).toBe(true);
  });

  it('treats finished deliveries as done', () => {
    expect(isBroadcastInFlight('completed')).toBe(false);
    expect(isBroadcastInFlight('partial')).toBe(false);
    expect(isBroadcastInFlight('failed')).toBe(false);
    expect(isBroadcastInFlight('cancelled')).toBe(false);
  });

  it('handles a missing status without polling', () => {
    expect(isBroadcastInFlight(undefined)).toBe(false);
    expect(broadcastPollInterval(undefined)).toBe(false);
  });

  it('polls only while the delivery is running', () => {
    expect(broadcastPollInterval('in_progress')).toBe(3000);
    expect(broadcastPollInterval('completed')).toBe(false);
  });
});
