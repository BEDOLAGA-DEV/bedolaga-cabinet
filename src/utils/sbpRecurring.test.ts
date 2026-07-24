import { describe, expect, it } from 'vitest';
import type { SbpRecurringInfo } from '../types';
import { isSbpFeatureDisabledError, sbpIntervalLabelKey, sbpUiState } from './sbpRecurring';

/**
 * Утилиты для СБП-автопродления (Platega recurrent). Бэк отдаёт GET-статусы
 * только 'none' | 'PENDING' | 'ACTIVE' | 'PAST_DUE' (CANCELLED/FAILED — это
 * терминальные состояния, до которых GET не доживает: запись либо удаляется,
 * либо переоткрывается новым PENDING). UI на неизвестный статус должен
 * деградировать в 'off', а не падать.
 */

describe('sbpIntervalLabelKey', () => {
  it.each([
    [1, 'subscription.sbpRecurring.interval.day'],
    [2, 'subscription.sbpRecurring.interval.week'],
    [3, 'subscription.sbpRecurring.interval.month'],
    [4, 'subscription.sbpRecurring.interval.year'],
    [undefined, 'subscription.sbpRecurring.interval.month'],
    [99, 'subscription.sbpRecurring.interval.month'],
  ])('interval=%s -> %s', (interval, expected) => {
    expect(sbpIntervalLabelKey(interval as number | undefined)).toBe(expected);
  });
});

describe('isSbpFeatureDisabledError', () => {
  it('403 + detail ровно "Platega recurrent disabled" -> true', () => {
    const error = {
      response: { status: 403, data: { detail: 'Platega recurrent disabled' } },
    };
    expect(isSbpFeatureDisabledError(error)).toBe(true);
  });

  it('неверный статус (404) -> false', () => {
    const error = {
      response: { status: 404, data: { detail: 'Platega recurrent disabled' } },
    };
    expect(isSbpFeatureDisabledError(error)).toBe(false);
  });

  it('неверный текст detail -> false', () => {
    const error = {
      response: { status: 403, data: { detail: 'Something else' } },
    };
    expect(isSbpFeatureDisabledError(error)).toBe(false);
  });

  it('detail — объект (другая форма 403), не должно падать -> false', () => {
    const error = {
      response: { status: 403, data: { detail: { code: 'blacklisted', message: 'x' } } },
    };
    expect(isSbpFeatureDisabledError(error)).toBe(false);
  });

  it('null error -> false, без исключений', () => {
    expect(isSbpFeatureDisabledError(null)).toBe(false);
  });

  it('произвольный не-axios объект -> false, без исключений', () => {
    expect(isSbpFeatureDisabledError({ foo: 'bar' })).toBe(false);
  });

  it('undefined -> false', () => {
    expect(isSbpFeatureDisabledError(undefined)).toBe(false);
  });

  it('строка вместо объекта ошибки -> false', () => {
    expect(isSbpFeatureDisabledError('plain string error')).toBe(false);
  });

  it('response без data -> false, без исключений', () => {
    expect(isSbpFeatureDisabledError({ response: { status: 403 } })).toBe(false);
  });
});

describe('sbpUiState', () => {
  const info = (overrides: Partial<SbpRecurringInfo>): SbpRecurringInfo => ({
    status: 'none',
    ...overrides,
  });

  it('фича отключена -> "hidden", даже если данные есть', () => {
    expect(sbpUiState(info({ status: 'ACTIVE' }), true)).toBe('hidden');
  });

  it('info === undefined -> "off"', () => {
    expect(sbpUiState(undefined, false)).toBe('off');
  });

  it('status \'none\' -> "off"', () => {
    expect(sbpUiState(info({ status: 'none' }), false)).toBe('off');
  });

  it('status \'PENDING\' -> "pending"', () => {
    expect(sbpUiState(info({ status: 'PENDING' }), false)).toBe('pending');
  });

  it('status \'ACTIVE\' -> "active"', () => {
    expect(sbpUiState(info({ status: 'ACTIVE' }), false)).toBe('active');
  });

  it('status \'PAST_DUE\' -> "past_due"', () => {
    expect(sbpUiState(info({ status: 'PAST_DUE' }), false)).toBe('past_due');
  });

  it('неизвестный статус \'CANCELLED\' -> "off"', () => {
    expect(sbpUiState(info({ status: 'CANCELLED' }), false)).toBe('off');
  });
});
