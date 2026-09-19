import { describe, expect, it } from 'vitest';
import { isLavaFeatureDisabledError, lavaPeriodLabelKey, lavaUiState } from './lavaRecurring';

describe('isLavaFeatureDisabledError', () => {
  it('detects exactly the disabled-feature 403', () => {
    expect(
      isLavaFeatureDisabledError({
        response: { status: 403, data: { detail: 'Lava recurrent disabled' } },
      }),
    ).toBe(true);
  });

  it('ignores other 403s and malformed errors', () => {
    // Другие guard'ы отдают тот же статус с иным detail — их прятать нельзя
    expect(
      isLavaFeatureDisabledError({ response: { status: 403, data: { detail: 'Blacklisted' } } }),
    ).toBe(false);
    expect(
      isLavaFeatureDisabledError({ response: { status: 403, data: { detail: { code: 'x' } } } }),
    ).toBe(false);
    expect(isLavaFeatureDisabledError({ response: { status: 500, data: {} } })).toBe(false);
    expect(isLavaFeatureDisabledError({ response: { status: 403 } })).toBe(false);
    expect(isLavaFeatureDisabledError(null)).toBe(false);
    expect(isLavaFeatureDisabledError('boom')).toBe(false);
  });
});

describe('lavaUiState', () => {
  it('hides the block when the feature is disabled', () => {
    expect(lavaUiState({ status: 'ACTIVE' }, true)).toBe('hidden');
  });

  it('maps backend statuses to UI states', () => {
    expect(lavaUiState({ status: 'PENDING' }, false)).toBe('pending');
    expect(lavaUiState({ status: 'ACTIVE' }, false)).toBe('active');
    expect(lavaUiState({ status: 'PAST_DUE' }, false)).toBe('past_due');
    expect(lavaUiState({ status: 'none' }, false)).toBe('off');
  });

  it('degrades unknown or missing state to off instead of hanging', () => {
    expect(lavaUiState({ status: 'SOMETHING_NEW' }, false)).toBe('off');
    expect(lavaUiState(undefined, false)).toBe('off');
  });
});

describe('lavaPeriodLabelKey', () => {
  it('labels canonical periods', () => {
    expect(lavaPeriodLabelKey(30)).toBe('subscription.lavaRecurring.period.month');
    expect(lavaPeriodLabelKey(365)).toBe('subscription.lavaRecurring.period.year');
  });

  it('returns null for non-canonical periods so the caller falls back to "N days"', () => {
    expect(lavaPeriodLabelKey(45)).toBeNull();
    expect(lavaPeriodLabelKey(undefined)).toBeNull();
  });
});
