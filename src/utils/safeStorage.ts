/**
 * Guarded access to Web Storage.
 *
 * `localStorage` / `sessionStorage` are not always usable objects. Privacy
 * modes, a "block site data" setting and sandboxed iframes make the property
 * access itself throw a SecurityError; a full quota makes writes throw. A bare
 * `localStorage.getItem()` inside a render-phase `useState` initialiser
 * therefore takes the whole app down through the app-level ErrorBoundary — the
 * login screen included, because the redirect to it renders too.
 *
 * These wrappers never throw. Reads return `null`, writes report success with a
 * boolean, and every operation is guarded on its own: a storage that refuses
 * writes but still serves reads keeps serving them. That matters — an over-quota
 * `localStorage` throws on `setItem` while `getItem`/`removeItem` work fine, and
 * treating it as wholly unusable would silently stop the session from hydrating
 * and stop "clear all auth state" from clearing anything.
 *
 * When a write cannot land, the value degrades to an in-memory map that lives
 * for a single page load, and reads prefer it over the backend: it is there only
 * because the backend refused the newer value. That is enough to keep the SPA
 * consistent while the document is alive, but NOT across a reload or a redirect
 * to an external provider and back.
 *
 * CALLERS MUST NOT IGNORE `false` FROM `setItem` when the value has to survive a
 * reload or an external redirect — a loop guard, a retry counter, an OAuth CSRF
 * state. In-memory success is not persistence, and treating it as such turns a
 * "cannot store" into a silent misbehaviour later.
 */

type StorageKind = 'local' | 'session';

const PROBE_KEY = '__safe_storage_probe__';

const memory: Record<StorageKind, Map<string, string>> = {
  local: new Map(),
  session: new Map(),
};

/**
 * Reading the global itself can throw, so even resolving the backend is
 * guarded. Deliberately not cached: a negative verdict cached for the whole
 * page load would keep a transiently failing storage switched off forever.
 */
function backend(kind: StorageKind): Storage | null {
  try {
    const store = (kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage) as
      | Storage
      | undefined;
    return store ?? null;
  } catch {
    return null;
  }
}

function createSafeStorage(kind: StorageKind) {
  const fallback = memory[kind];

  /** Never throws. `null` when the key is unset or the storage is unusable. */
  function getItem(key: string): string | null {
    // Memory wins: a key is only here because the backend refused to store it,
    // so whatever the backend still holds for that key is older.
    const buffered = fallback.get(key);
    if (buffered !== undefined) return buffered;

    const store = backend(kind);
    if (!store) return null;
    try {
      return store.getItem(key);
    } catch {
      return null;
    }
  }

  /** Never throws. `false` means the value only lives in memory for this page load. */
  function setItem(key: string, value: string): boolean {
    const store = backend(kind);
    if (store) {
      try {
        store.setItem(key, value);
        // Drop any stale buffered copy so a later read does not shadow the
        // value that just landed in the backend.
        fallback.delete(key);
        return true;
      } catch {
        // Quota exceeded, or a storage that turned read-only mid-session.
      }
    }
    fallback.set(key, value);
    return false;
  }

  /**
   * Never throws. Always reaches for the backend, even when writes are failing:
   * removal is what "log out" and "clear stale session" rely on, and a storage
   * that rejects writes usually still deletes.
   */
  function removeItem(key: string): void {
    fallback.delete(key);
    const store = backend(kind);
    if (!store) return;
    try {
      store.removeItem(key);
    } catch {
      // Blocked storage — nothing to remove.
    }
  }

  /** Read + `JSON.parse`. Returns `fallbackValue` on a missing key or malformed JSON. */
  function getJson<T>(key: string, fallbackValue: T): T {
    const raw = getItem(key);
    if (raw === null) return fallbackValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallbackValue;
    }
  }

  /** `JSON.stringify` + write. `false` when the value could not be persisted. */
  function setJson(key: string, value: unknown): boolean {
    try {
      return setItem(key, JSON.stringify(value));
    } catch {
      // Circular reference in `value`.
      return false;
    }
  }

  return { getItem, setItem, removeItem, getJson, setJson };
}

export const safeLocal = createSafeStorage('local');
export const safeSession = createSafeStorage('session');

/**
 * Whether a value written now would actually persist. Probes with a throwaway
 * write, the way i18next-browser-languagedetector does it — `typeof window
 * !== 'undefined'` is an SSR guard and does not detect a blocked storage.
 * Diagnostics and UX hints only; the wrappers above never need it.
 */
export function isStorageAvailable(kind: StorageKind = 'local'): boolean {
  const store = backend(kind);
  if (!store) return false;
  try {
    store.setItem(PROBE_KEY, '1');
    store.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Test seam: drops the in-memory fallback so cases do not leak into each other. */
export function resetSafeStorage(): void {
  memory.local.clear();
  memory.session.clear();
}
