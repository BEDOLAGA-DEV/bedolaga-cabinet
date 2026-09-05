import { describe, expect, it } from 'vitest';
import { toneClasses, verdictLabelKey, verdictTone } from './verdict';

describe('verdictTone', () => {
  it('цвет — по соответствию ожиданию, а не по самому вердикту', () => {
    expect(verdictTone('reachable', true)).toBe('success');
    expect(verdictTone('blocked', false)).toBe('error');
    expect(verdictTone('blocked', null)).toBe('neutral');
    expect(verdictTone('reachable', null)).toBe('neutral');
    expect(verdictTone('unknown', null)).toBe('warning');
    expect(verdictTone('cancelled', null)).toBe('neutral');
  });

  it('классы только из токенов палитры', () => {
    for (const tone of ['success', 'error', 'warning', 'neutral'] as const) {
      const classes = toneClasses(tone);
      expect(classes).not.toMatch(/(gray|green|red|yellow|purple|blue)-\d/);
      expect(classes).toMatch(/(success|error|warning|dark)-/);
    }
  });

  it('ключ подписи вердикта', () => {
    expect(verdictLabelKey('down')).toBe('admin.reachability.verdict.down');
  });
});
