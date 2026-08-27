type ObjectWithOptionalHasOwn = ObjectConstructor & {
  hasOwn?: (obj: object, prop: PropertyKey) => boolean;
};

export function installObjectHasOwnPolyfill(): void {
  const objectWithOptionalHasOwn = Object as ObjectWithOptionalHasOwn;
  if (typeof objectWithOptionalHasOwn.hasOwn === 'function') {
    return;
  }

  objectWithOptionalHasOwn.hasOwn = (obj: object, prop: PropertyKey): boolean =>
    Object.hasOwn(obj, prop);
}
