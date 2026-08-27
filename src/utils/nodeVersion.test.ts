import { describe, expect, it } from 'vitest';
import { GEOCHECK_MIN_NODE_VERSION, isVersionAtLeast, supportsGeoCheck } from './nodeVersion';

describe('isVersionAtLeast', () => {
  it.each([
    ['3.3.0', true],
    ['3.3.1', true],
    ['3.4.0', true],
    ['4.0.0', true],
    ['v3.3.0', true],
    ['3.3', true],
    ['3.2.9', false],
    ['3.2.99', false],
    ['2.9.9', false],
    ['3', false],
  ])('%s vs 3.3.0 -> %s', (value, expected) => {
    expect(isVersionAtLeast(value, '3.3.0')).toBe(expected);
  });

  it('сравнивает числа, а не строки: 3.10.0 новее 3.9.0', () => {
    expect(isVersionAtLeast('3.10.0', '3.9.0')).toBe(true);
  });

  it('пререлиз целевой версии считается достаточным — фича там уже есть', () => {
    expect(isVersionAtLeast('3.3.0-rc.1', '3.3.0')).toBe(true);
  });

  it.each([undefined, null, '', 'unknown', 'dev'])(
    'нераспознанное значение %s -> false',
    (value) => {
      expect(isVersionAtLeast(value, '3.3.0')).toBe(false);
    },
  );
});

describe('supportsGeoCheck', () => {
  it('смотрит именно на версию узла, а не xray', () => {
    expect(supportsGeoCheck({ node: '3.3.0' })).toBe(true);
    expect(supportsGeoCheck({ node: '3.2.0' })).toBe(false);
  });

  it.each([undefined, null, {}])('без версии узла — false (%s)', (versions) => {
    expect(supportsGeoCheck(versions as { node?: string } | null | undefined)).toBe(false);
  });

  it('порог совпадает с задокументированным минимумом', () => {
    expect(supportsGeoCheck({ node: GEOCHECK_MIN_NODE_VERSION })).toBe(true);
  });
});
