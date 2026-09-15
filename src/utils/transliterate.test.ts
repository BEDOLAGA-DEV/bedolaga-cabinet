import { describe, expect, it } from 'vitest';

import { transliterate } from './transliterate';

describe('transliterate', () => {
  it('кириллица латиницей, латиница и цифры как есть', () => {
    expect(transliterate('Александра Ёлкина 2026')).toBe('aleksandra yolkina 2026');
    expect(transliterate('ZeroPing')).toBe('zeroping');
  });
});
