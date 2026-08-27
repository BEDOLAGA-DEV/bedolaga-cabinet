import { afterEach, describe, expect, it } from 'vitest';
import { installObjectHasOwnPolyfill } from './installObjectHasOwnPolyfill';

type ObjectWithOptionalHasOwn = ObjectConstructor & {
  hasOwn?: (obj: object, prop: PropertyKey) => boolean;
};

const objectWithHasOwn = Object as ObjectWithOptionalHasOwn;
const originalHasOwn = objectWithHasOwn.hasOwn;

function removeHasOwn(): void {
  Reflect.deleteProperty(Object, 'hasOwn');
}

function getInstalledHasOwn(): (obj: object, prop: PropertyKey) => boolean {
  const maybeHasOwn = (Object as ObjectWithOptionalHasOwn).hasOwn;
  if (typeof maybeHasOwn !== 'function') {
    throw new Error('Object.hasOwn polyfill was not installed');
  }
  return maybeHasOwn;
}

function restoreOriginalHasOwn(): void {
  if (originalHasOwn) {
    Object.defineProperty(Object, 'hasOwn', {
      value: originalHasOwn,
      configurable: true,
      writable: true,
    });
    return;
  }

  removeHasOwn();
}

afterEach(() => {
  restoreOriginalHasOwn();
});

describe('installObjectHasOwnPolyfill', () => {
  it('installs fallback only when Object.hasOwn is absent and preserves a native implementation', () => {
    const nativeHasOwn = (obj: object, prop: PropertyKey): boolean =>
      Reflect.getOwnPropertyDescriptor(obj, prop) !== undefined;

    Object.defineProperty(Object, 'hasOwn', {
      value: nativeHasOwn,
      configurable: true,
      writable: true,
    });

    installObjectHasOwnPolyfill();

    expect(objectWithHasOwn.hasOwn).toBe(nativeHasOwn);
  });

  it('returns true for own properties and false for inherited/missing properties', () => {
    removeHasOwn();

    installObjectHasOwnPolyfill();

    const hasOwn = getInstalledHasOwn();

    const proto = { inherited: 1 };
    const obj = Object.create(proto) as { own: number; inherited?: number; missing?: number };
    obj.own = 42;

    expect(hasOwn(obj, 'own')).toBe(true);
    expect(hasOwn(obj, 'inherited')).toBe(false);
    expect(hasOwn(obj, 'missing')).toBe(false);
  });

  it('terminates for old-webview fallback calls (regression: self-referential implementation)', () => {
    removeHasOwn();

    installObjectHasOwnPolyfill();

    const hasOwn = getInstalledHasOwn();

    const obj = { own: 'value' };

    expect(() => hasOwn(obj, 'own')).not.toThrow();
    expect(hasOwn(obj, 'own')).toBe(true);
  });
});
