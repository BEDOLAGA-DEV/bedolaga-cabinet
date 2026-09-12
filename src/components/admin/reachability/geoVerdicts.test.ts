import { describe, expect, it } from 'vitest';
import {
  GEO_VERDICTS,
  isResultVerdict,
  regionTone,
  verdictTone,
  worstVerdict,
} from './geoVerdicts';

describe('geoVerdicts', () => {
  it('легенда — десять вердиктов в порядке оригинала', () => {
    expect(GEO_VERDICTS).toEqual([
      'ok',
      'partial',
      'throttled',
      'blocked',
      'unconfirmed',
      'exit_bad',
      'target_error',
      'no_ru_node',
      'no_udp',
      'port_blocked',
    ]);
  });
  it('результат — только шесть; шум сервиса результатом не считается', () => {
    expect(
      ['ok', 'partial', 'throttled', 'blocked', 'unconfirmed', 'target_error'].every(
        isResultVerdict,
      ),
    ).toBe(true);
    expect(['exit_bad', 'no_ru_node', 'no_udp', 'port_blocked', 'чушь'].some(isResultVerdict)).toBe(
      false,
    );
  });
  it('худший результативный вердикт: blocked > throttled/target_error > partial/unconfirmed > ok', () => {
    expect(worstVerdict(['ok', 'partial'])).toBe('partial');
    expect(worstVerdict(['ok', 'unconfirmed', 'throttled'])).toBe('throttled');
    expect(worstVerdict(['throttled', 'blocked', 'exit_bad'])).toBe('blocked');
    expect(worstVerdict(['exit_bad', 'no_ru_node'])).toBeNull();
    expect(worstVerdict([])).toBeNull();
  });
  it('тон региона по худшему результату, серый без результатов', () => {
    expect(regionTone([{ verdict: 'ok' }, { verdict: 'ok' }])).toBe('ok');
    expect(regionTone([{ verdict: 'ok' }, { verdict: 'blocked' }])).toBe('down');
    expect(regionTone([{ verdict: 'exit_bad' }])).toBe('na');
    expect(verdictTone('throttled')).toBe('orange');
    expect(verdictTone('no_udp')).toBe('violet');
    expect(verdictTone('чушь')).toBe('na');
  });
});
