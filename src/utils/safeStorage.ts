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
 * boolean. When the backend is unusable they degrade to an in-memory map that
 * lives for a single page load: enough to keep the SPA consistent while the
 * document is alive, but NOT across a reload or a redirect to an OAuth provider
 * and back.
 *
 * Availability is probed once per backend with a throwaway write, the way
 * i18next-browser-languagedetector does it. `typeof window !== 'undefined'` is
 * an SSR guard and does not detect a blocked storage.
 */

type StorageKind = 'local' | 'session';

const PROBE_KEY = '__safe_storage_probe__';

const memory: Record<StorageKind, Map<string, string>> = {
  local: new Map(),
  session: new Map(),
};

/** Cached probe result. `undefined` means "not probed yet". */
const resolved: Record<StorageKind, Storage | null | undefined> = {
  local: undefined,
  session: undefined,
};

function probe(kind: StorageKind): Storage | null {
  try {
    // lib.dom types these as an always-present `Storage`; in a blocked browser
    // and under Node they are not, hence the widening cast inside the try.
    const store = (kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage) as
      | Storage
      | undefined;
    if (!store) return null;

    store.setItem(PROBE_KEY, '1');
    store.removeItem(PROBE_KEY);
    return store;
  } catch {
    return null;
  }
}

function getStore(kind: StorageKind): Storage | null {
  if (resolved[kind] === undefined) {
    resolved[kind] = probe(kind);
  }
  return resolved[kind] ?? null;
}

function createSafeStorage(kind: StorageKind) {
  const fallback = memory[kind];

  /** Never throws. `null` when the key is unset or the storage is unusable. */
  function getItem(key: string): string | null {
    const store = getStore(kind);
    if (!store) return fallback.get(key) ?? null;
    try {
      return store.getItem(key);
    } catch {
      return fallback.get(key) ?? null;
    }
  }

  /** Never throws. `false` means the value only lives in memory for this page load. */
  function setItem(key: string, value: string): boolean {
    const store = getStore(kind);
    if (store) {
      try {
        store.setItem(key, value);
        return true;
      } catch {
        // Quota exceeded, or a storage that turned read-only mid-session.
      }
    }
    fallback.set(key, value);
    return false;
  }

  /** Never throws. */
  function removeItem(key: string): void {
    fallback.delete(key);
    const store = getStore(kind);
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

/** Diagnostics only — do not branch business logic on this. */
export function isStorageAvailable(kind: StorageKind = 'local'): boolean {
  return getStore(kind) !== null;
}

/** Test seam: drops the cached probe and the in-memory fallback. */
export function resetStorageProbe(): void {
  resolved.local = undefined;
  resolved.session = undefined;
  memory.local.clear();
  memory.session.clear();
}
