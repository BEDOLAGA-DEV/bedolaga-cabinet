import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isStorageAvailable, resetSafeStorage, safeLocal, safeSession } from './safeStorage';

/**
 * Обёртка обязана никогда не бросать — и при этом не терять того, что ещё работает.
 *
 * В браузере доступ к хранилищу — это не «вернуть null»: в приватном режиме
 * Safari, при настройке «блокировать данные сайтов» и во встроенных вебвью само
 * обращение к свойству кидает SecurityError. Отдельный и куда более частый
 * случай — переполненная квота: setItem бросает, а getItem и removeItem работают.
 * Ранняя версия обёртки считала такое хранилище нерабочим целиком, из-за чего
 * переставала гидрироваться сессия и переставал чиститься выход.
 */

const KINDS = [
  ['local', safeLocal, 'localStorage'],
  ['session', safeSession, 'sessionStorage'],
] as const;

const originals = new Map<string, PropertyDescriptor | undefined>();

function remember(name: string) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
}

function defineStorage(name: string, value: unknown) {
  remember(name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function throwingAccessor(name: string) {
  remember(name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

function workingStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => {
      map.delete(k);
    },
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

/** Переполненная квота: чтение и удаление живы, запись бросает. */
function readOnlyStorage(seed: Record<string, string> = {}): Storage {
  const store = workingStorage();
  for (const [k, v] of Object.entries(seed)) store.setItem(k, v);
  store.setItem = () => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  };
  return store;
}

beforeEach(() => resetSafeStorage());

afterEach(() => {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete (globalThis as Record<string, unknown>)[name];
  }
  originals.clear();
  resetSafeStorage();
});

describe.each(KINDS)('safe%s', (_kind, safe, globalName) => {
  it('работает как обычное хранилище, когда оно доступно', () => {
    defineStorage(globalName, workingStorage());

    expect(safe.setItem('k', 'v')).toBe(true);
    expect(safe.getItem('k')).toBe('v');
    safe.removeItem('k');
    expect(safe.getItem('k')).toBeNull();
  });

  it('не бросает, когда обращение к глобалу кидает SecurityError', () => {
    throwingAccessor(globalName);

    expect(() => safe.getItem('k')).not.toThrow();
    expect(() => safe.removeItem('k')).not.toThrow();
    expect(safe.setItem('k', 'v')).toBe(false);
  });

  it('держит значение в памяти на время страницы, когда записать некуда', () => {
    throwingAccessor(globalName);

    safe.setItem('k', 'v');

    expect(safe.getItem('k')).toBe('v');
  });

  it('не бросает, когда глобал undefined (node без web storage)', () => {
    defineStorage(globalName, undefined);

    expect(safe.getItem('k')).toBeNull();
    expect(safe.setItem('k', 'v')).toBe(false);
  });

  it('getJson и setJson переживают недоступное хранилище', () => {
    throwingAccessor(globalName);

    expect(safe.getJson('missing', { fallback: true })).toEqual({ fallback: true });
    expect(safe.setJson('k', { a: 1 })).toBe(false);
    expect(safe.getJson('k', null)).toEqual({ a: 1 });
  });
});

describe('переполненное хранилище: писать нельзя, читать и удалять можно', () => {
  it('продолжает ЧИТАТЬ с диска, а не считает хранилище мёртвым', () => {
    defineStorage('localStorage', readOnlyStorage({ 'cabinet-auth': '{"user":1}' }));

    // Провал записи не должен ослеплять чтение — иначе сессия не гидрируется.
    expect(safeLocal.setItem('other', 'v')).toBe(false);
    expect(safeLocal.getItem('cabinet-auth')).toBe('{"user":1}');
  });

  it('продолжает УДАЛЯТЬ с диска, иначе выход не вычищает сессию', () => {
    const store = readOnlyStorage({ 'cabinet-auth': '{"user":1}' });
    defineStorage('localStorage', store);

    safeLocal.setItem('probe-write', 'v'); // провалится, уйдёт в память
    safeLocal.removeItem('cabinet-auth');

    expect(store.getItem('cabinet-auth')).toBeNull();
    expect(safeLocal.getItem('cabinet-auth')).toBeNull();
  });

  it('отданное в память значение читается обратно, а не протухший диск', () => {
    defineStorage('localStorage', readOnlyStorage({ k: 'старое' }));

    expect(safeLocal.setItem('k', 'новое')).toBe(false);
    expect(safeLocal.getItem('k')).toBe('новое');
  });

  it('хранилище, ставшее read-only посреди сессии, не бросает', () => {
    const store = workingStorage();
    defineStorage('localStorage', store);
    expect(safeLocal.setItem('k', 'v1')).toBe(true);

    store.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };

    expect(safeLocal.setItem('k', 'v2')).toBe(false);
    expect(safeLocal.getItem('k')).toBe('v2');
  });

  it('успешная запись убирает протухшую копию из памяти', () => {
    const store = readOnlyStorage();
    defineStorage('localStorage', store);
    safeLocal.setItem('k', 'из-памяти');

    defineStorage('localStorage', workingStorage());
    expect(safeLocal.setItem('k', 'на-диск')).toBe(true);

    expect(safeLocal.getItem('k')).toBe('на-диск');
  });
});

describe('getJson', () => {
  it('возвращает фоллбек на битом JSON, а не бросает', () => {
    const store = workingStorage();
    store.setItem('broken', '{не json');
    defineStorage('localStorage', store);

    expect(safeLocal.getJson('broken', { ok: true })).toEqual({ ok: true });
  });

  it('переживает круговую ссылку в setJson', () => {
    defineStorage('localStorage', workingStorage());
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(safeLocal.setJson('k', circular)).toBe(false);
  });
});

describe('isStorageAvailable', () => {
  it('различает рабочее, переполненное и заблокированное хранилище', () => {
    defineStorage('localStorage', workingStorage());
    expect(isStorageAvailable('local')).toBe(true);

    defineStorage('localStorage', readOnlyStorage());
    expect(isStorageAvailable('local')).toBe(false);

    throwingAccessor('localStorage');
    expect(isStorageAvailable('local')).toBe(false);
  });

  it('не кэширует отрицательный вердикт на всю страницу', () => {
    throwingAccessor('localStorage');
    expect(isStorageAvailable('local')).toBe(false);

    // Транзиентный отказ не должен выключать хранилище навсегда.
    defineStorage('localStorage', workingStorage());
    expect(isStorageAvailable('local')).toBe(true);
    expect(safeLocal.setItem('k', 'v')).toBe(true);
  });
});
