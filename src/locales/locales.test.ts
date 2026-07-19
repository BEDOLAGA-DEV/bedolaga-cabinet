import { describe, expect, it } from 'vitest';
import en from './en.json';
import ru from './ru.json';

/**
 * Синхронность en/ru локалей. i18next настроен с fallbackLng: 'ru' — ключ,
 * отсутствующий в en.json, отдаёт англоязычным пользователям РУССКИЙ текст
 * (а не инлайн-дефолт из кода). Так весь namespace resetPassword.* уехал в
 * прод по-русски. Тест ловит новые дыры при добавлении ключей в одну локаль.
 */

// Русскоязычные словари бэкенд-настроек — осознанно только в ru
// (en падает на сырые имена настроек, это админ-экран).
const RU_ONLY_NAMESPACES = [
  'admin.settings.settingNames.',
  'admin.settings.categories.',
  'admin.settings.presets.',
];

// Известные дыры. #489 смержен, realtimeTitle переведён — список пуст.
const KNOWN_MISSING_IN_EN = new Set<string>([
  // Пусто — так и держать: новые ключи переводите в en.json, а не вносите сюда.
]);

const KNOWN_PLACEHOLDER_MISMATCHES = new Set<string>([]);

// Плюральные категории i18next: ru использует _one/_few/_many, en — _one/_other.
// Сравниваем БАЗОВЫЕ ключи (без плюрального суффикса); context-варианты
// (напр. _trial) — самостоятельные ключи и обязаны существовать в обеих локалях.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

type Tree = { [key: string]: Tree | string };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out.set(path, value);
    } else {
      for (const [k, v] of flatten(value, path)) {
        out.set(k, v);
      }
    }
  }
  return out;
}

const enFlat = flatten(en as Tree);
const ruFlat = flatten(ru as Tree);

function baseKeys(flat: Map<string, string>): Set<string> {
  return new Set([...flat.keys()].map((k) => k.replace(PLURAL_SUFFIX, '')));
}

const enBases = baseKeys(enFlat);
const ruBases = baseKeys(ruFlat);

describe('синхронность локалей en/ru', () => {
  it('каждый en-ключ существует в ru', () => {
    const missing = [...enBases].filter((k) => !ruBases.has(k));
    expect(missing).toEqual([]);
  });

  it('каждый ru-ключ существует в en (кроме ru-only словарей настроек)', () => {
    const missing = [...ruBases].filter(
      (k) =>
        !enBases.has(k) &&
        !RU_ONLY_NAMESPACES.some((ns) => k.startsWith(ns)) &&
        !KNOWN_MISSING_IN_EN.has(k),
    );
    expect(missing).toEqual([]);
  });

  it('плейсхолдеры {{...}} совпадают в общих ключах', () => {
    const PH = /\{\{[^}]+\}\}/g;
    const mismatches: string[] = [];
    for (const [key, ruValue] of ruFlat) {
      const enValue = enFlat.get(key);
      if (enValue === undefined || KNOWN_PLACEHOLDER_MISMATCHES.has(key)) {
        continue;
      }
      const ruPh = (ruValue.match(PH) ?? []).sort().join(',');
      const enPh = (enValue.match(PH) ?? []).sort().join(',');
      if (ruPh !== enPh) {
        mismatches.push(`${key}: ru=[${ruPh}] en=[${enPh}]`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
