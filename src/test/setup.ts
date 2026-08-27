/**
 * Restores jsdom's Web Storage on `globalThis` for tests.
 *
 * Node >= 25 ships web storage enabled by default, so `globalThis.localStorage`
 * already exists as an own accessor before jsdom is wired up — and it resolves
 * to `undefined` unless the process was started with `--localstorage-file`.
 * Vitest's `populateGlobal()` copies jsdom's window keys onto `globalThis` but
 * skips any key that is already present and is not in its own whitelist
 * (`getWindowKeys`: `if (k in global) return keysArray.includes(k)`), and
 * neither `localStorage` nor `sessionStorage` is whitelisted. jsdom's Storage
 * therefore never reaches `globalThis`, and every bare `localStorage.getItem()`
 * throws "Cannot read properties of undefined".
 *
 * This is not limited to our own code: zustand's `persist` middleware writes
 * through the bare global too, so without this file every `set()` on the auth
 * store throws inside the library.
 *
 * On Node without web storage (24 — see .nvmrc and the CI workflows) jsdom's
 * Storage arrives on its own and this file changes nothing. In the plain `node`
 * environment it does not run at all.
 *
 * NOTE: this fixes the test environment only. Application code must not rely on
 * a bare `localStorage` either — a browser with site data blocked throws on the
 * property access itself. Use `src/utils/safeStorage.ts` there.
 */

type GlobalRecord = Record<string, unknown>;

function isStorage(value: unknown): value is Storage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Storage).getItem === 'function' &&
    typeof (value as Storage).setItem === 'function'
  );
}

/**
 * Vitest points `document.defaultView` at `globalThis`, so the real jsdom
 * `Window` — the only object owning the real Storage instances — has to be read
 * through the untouched `Document.prototype.defaultView` getter.
 */
function getJsdomWindow(): (Window & GlobalRecord) | undefined {
  const doc = (globalThis as GlobalRecord).document as Document | undefined;
  if (!doc) return undefined;

  let proto: object | null = Object.getPrototypeOf(doc);
  while (proto !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'defaultView');
    if (descriptor?.get) {
      const view = descriptor.get.call(doc) as unknown;
      return view && view !== globalThis ? (view as Window & GlobalRecord) : undefined;
    }
    proto = Object.getPrototypeOf(proto);
  }
  return undefined;
}

/**
 * Deliberately no in-memory fallback: if the jsdom window ever becomes
 * unreachable because vitest internals changed, tests should fail loudly with
 * the original TypeError rather than quietly run against a fake Storage whose
 * semantics drift from a real browser.
 */
function restore(name: 'localStorage' | 'sessionStorage'): void {
  const win = getJsdomWindow();
  const fromJsdom = win ? (win[name] as unknown) : undefined;
  if (!isStorage(fromJsdom)) return;

  let current: unknown;
  try {
    current = (globalThis as GlobalRecord)[name];
  } catch {
    current = undefined;
  }
  // Already wired correctly (Node without web storage) — leave it alone.
  if (current === fromJsdom) return;

  Object.defineProperty(globalThis, name, {
    value: fromJsdom,
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

if (typeof (globalThis as GlobalRecord).document !== 'undefined') {
  restore('localStorage');
  restore('sessionStorage');
}
