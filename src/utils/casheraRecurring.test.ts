import { describe, expect, it } from 'vitest';
import {
  casheraIntervalLabelKey,
  casheraUiState,
  isCasheraFeatureDisabledError,
} from './casheraRecurring';

describe('isCasheraFeatureDisabledError', () => {
  it('detects exactly the disabled-feature 403', () => {
    expect(
      isCasheraFeatureDisabledError({
        response: { status: 403, data: { detail: 'Cashera recurrent disabled' } },
      }),
    ).toBe(true);
  });

  it('ignores other 403s and malformed errors', () => {
    // Другие guard'ы отдают тот же статус с иным detail — их прятать нельзя
    expect(
      isCasheraFeatureDisabledError({ response: { status: 403, data: { detail: 'Blacklisted' } } }),
    ).toBe(false);
    expect(
      isCasheraFeatureDisabledError({ response: { status: 403, data: { detail: { code: 'x' } } } }),
    ).toBe(false);
    expect(isCasheraFeatureDisabledError({ response: { status: 500, data: {} } })).toBe(false);
    expect(isCasheraFeatureDisabledError({ response: { status: 403 } })).toBe(false);
    expect(isCasheraFeatureDisabledError(null)).toBe(false);
    expect(isCasheraFeatureDisabledError('boom')).toBe(false);
  });
});

describe('casheraUiState', () => {
  it('hides the block when the feature is disabled', () => {
    expect(casheraUiState({ status: 'ACTIVE' }, true)).toBe('hidden');
  });

  it('maps backend statuses to UI states', () => {
    expect(casheraUiState({ status: 'PENDING' }, false)).toBe('pending');
    expect(casheraUiState({ status: 'ACTIVE' }, false)).toBe('active');
    expect(casheraUiState({ status: 'PAST_DUE' }, false)).toBe('past_due');
    expect(casheraUiState({ status: 'none' }, false)).toBe('off');
  });

  it('degrades unknown or missing state to off instead of hanging', () => {
    expect(casheraUiState({ status: 'SOMETHING_NEW' }, false)).toBe('off');
    expect(casheraUiState(undefined, false)).toBe('off');
  });
});

describe('casheraIntervalLabelKey', () => {
  it('labels every Cashera interval', () => {
    expect(casheraIntervalLabelKey('daily')).toBe('subscription.casheraRecurring.interval.daily');
    expect(casheraIntervalLabelKey('weekly')).toBe('subscription.casheraRecurring.interval.weekly');
    expect(casheraIntervalLabelKey('monthly')).toBe(
      'subscription.casheraRecurring.interval.monthly',
    );
    expect(casheraIntervalLabelKey('yearly')).toBe('subscription.casheraRecurring.interval.yearly');
  });

  it('falls back to monthly for an unknown or missing interval', () => {
    expect(casheraIntervalLabelKey(undefined)).toBe(
      'subscription.casheraRecurring.interval.monthly',
    );
    expect(casheraIntervalLabelKey('fortnightly')).toBe(
      'subscription.casheraRecurring.interval.monthly',
    );
  });
});
