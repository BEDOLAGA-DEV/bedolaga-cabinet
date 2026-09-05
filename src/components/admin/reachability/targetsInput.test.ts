import { describe, expect, it } from 'vitest';
import { MAX_CUSTOM_TARGETS, parseTargets } from './targetsInput';

/** Поле «Свои адреса»: до 10 целей через запятую или с новой строки, без дублей и пустых. */

describe('parseTargets', () => {
  it('режет по запятым и переносам, убирает пустые и дубли', () => {
    expect(parseTargets('ya.ru, 77.88.8.8\n\n github.com:443 , ya.ru')).toEqual({
      targets: ['ya.ru', '77.88.8.8', 'github.com:443'],
      overLimit: 0,
    });
  });

  it('оставляет первые десять, остальное считает переполнением', () => {
    const text = Array.from({ length: 13 }, (_, i) => `10.0.0.${i}`).join(',');
    const parsed = parseTargets(text);
    expect(parsed.targets).toHaveLength(MAX_CUSTOM_TARGETS);
    expect(parsed.overLimit).toBe(3);
  });

  it('пустая строка — пусто', () => {
    expect(parseTargets('')).toEqual({ targets: [], overLimit: 0 });
  });
});
