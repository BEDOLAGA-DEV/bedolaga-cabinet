import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageProbe, safeLocal, safeSession } from './safeStorage';

/**
 * Обёртка обязана никогда не бросать.
 *
 * В браузере доступ к хранилищу — это не «вернуть null»: в приватном режиме
 * Safari, при настройке «блокировать данные сайтов» и во встроенных вебвью само
 * обращение к свойству кидает SecurityError. Чтение в фазе рендера у корня
 * дерева при этом кладёт всё приложение, включая экран логина.
 */

function defineStorage(name: 'localStorage' | 'sessionStorage', value: unknown) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function throwingAccessor(name: 'localStorage' | 'sessionStorage') {
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
    removeItem: (k: string) => map.delete(k) as unknown as void,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

beforeEach(() => resetStorageProbe());

describe('safeLocal', () => {
  it('работает как обычное хранилище, когда оно доступно', () => {
    defineStorage('localStorage', workingStorage());

    expect(safeLocal.setItem('k', 'v')).toBe(true);
    expect(safeLocal.getItem('k')).toBe('v');
    safeLocal.removeItem('k');
    expect(safeLocal.getItem('k')).toBeNull();
  });

  it('не бросает, когда обращение к глобалу кидает SecurityError', () => {
    throwingAccessor('localStorage');

    expect(() => safeLocal.getItem('k')).not.toThrow();
    expect(() => safeLocal.setItem('k', 'v')).not.toThrow();
    expect(() => safeLocal.removeItem('k')).not.toThrow();
    expect(safeLocal.setItem('k', 'v')).toBe(false);
  });

  it('держит значение в памяти на время страницы, когда записать некуда', () => {
    throwingAccessor('localStorage');

    safeLocal.setItem('k', 'v');

    expect(safeLocal.getItem('k')).toBe('v');
  });

  it('не бросает, когда глобал undefined (node без web storage)', () => {
    defineStorage('localStorage', undefined);

    expect(safeLocal.getItem('k')).toBeNull();
    expect(safeLocal.setItem('k', 'v')).toBe(false);
  });

  it('не бросает, когда запись упирается в квоту', () => {
    const store = workingStorage();
    store.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    defineStorage('localStorage', store);

    expect(safeLocal.setItem('k', 'v')).toBe(false);
    expect(safeLocal.getItem('k')).toBe('v');
  });
});

describe('safeLocal.getJson', () => {
  it('возвращает фоллбек на битом JSON, а не бросает', () => {
    const store = workingStorage();
    store.setItem('broken', '{не json');
    defineStorage('localStorage', store);

    expect(safeLocal.getJson('broken', { ok: true })).toEqual({ ok: true });
  });

  it('возвращает фоллбек, когда ключа нет', () => {
    defineStorage('localStorage', workingStorage());

    expect(safeLocal.getJson('missing', 'default')).toBe('default');
  });

  it('переживает круговую ссылку в setJson', () => {
    defineStorage('localStorage', workingStorage());
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => safeLocal.setJson('k', circular)).not.toThrow();
    expect(safeLocal.setJson('k', circular)).toBe(false);
  });
});

describe('safeSession', () => {
  it('не бросает на недоступном sessionStorage', () => {
    throwingAccessor('sessionStorage');

    expect(() => safeSession.setItem('k', 'v')).not.toThrow();
    expect(safeSession.getItem('k')).toBe('v');
  });
});
