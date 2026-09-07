import { describe, expect, it } from 'vitest';
import { coreVersion } from './cores';

/** Ядро Xray показываем номером версии (как оригинал): stable → 26.3.27. Без справочника — как есть. */

describe('coreVersion', () => {
  it('подставляет номер из статуса, без него оставляет ключ', () => {
    expect(coreVersion({ stable: '26.3.27', prerelease: '26.7.11' }, 'prerelease')).toBe('26.7.11');
    expect(coreVersion({}, 'stable')).toBe('stable');
    expect(coreVersion(undefined, 'stable')).toBe('stable');
  });
});
