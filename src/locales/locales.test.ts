import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import en from './en.json';
import fa from './fa.json';
import ru from './ru.json';
import zh from './zh.json';

// Missing translations silently fall back to Russian. Check every shipped language,
// including admin settings, while allowing each language its own plural categories.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
type Tree = { [key: string]: Tree | string };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

function families(flat: Map<string, string>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const [key, value] of flat) {
    const base = key.replace(PLURAL_SUFFIX, '');
    const signatures = result.get(base) ?? new Set<string>();
    signatures.add([...(value.match(/\{\{[^}]+\}\}/g) ?? [])].sort().join(','));
    result.set(base, signatures);
  }
  return result;
}

const ruFlat = flatten(ru as Tree);
const ruFamilies = families(ruFlat);

for (const [language, tree] of Object.entries({ en, zh, fa })) {
  const flat = flatten(tree as Tree);
  const translatedFamilies = families(flat);
  describe(`translation coverage: ${language}`, () => {
    it('contains every Russian key and no orphan keys', () => {
      expect([...translatedFamilies.keys()].sort()).toEqual([...ruFamilies.keys()].sort());
    });

    it('preserves placeholders, including translated plural variants', () => {
      const problems: string[] = [];
      for (const [base, signatures] of translatedFamilies) {
        const expected = ruFamilies.get(base);
        if (!expected) continue; // Reported by the key coverage test.
        for (const signature of signatures) {
          if (!expected.has(signature)) problems.push(`${base}: ${signature}`);
        }
      }
      expect(problems).toEqual([]);
    });

    it('does not leave empty translations', () => {
      const empty = [...flat].filter(([key, value]) => ruFlat.get(key)?.trim() && !value.trim());
      expect(empty).toEqual([]);
    });
  });
}

// Exercise the actual resolver: matching base keys alone cannot detect a missing
// plural form. Counts here represent integer device/day/user quantities.
const pluralKeys = [
  ...new Set(
    [...ruFlat.keys()]
      .filter((key) => PLURAL_SUFFIX.test(key))
      .map((key) => key.replace(PLURAL_SUFFIX, '')),
  ),
].filter(
  (base) =>
    [...ruFlat.keys()].filter((key) => key.startsWith(`${base}_`) && PLURAL_SUFFIX.test(key))
      .length > 1,
);

for (const [language, translation] of Object.entries({ ru, en, zh, fa })) {
  it(`resolves integer plural forms without fallback: ${language}`, async () => {
    const instance = i18next.createInstance();
    await instance.init({
      lng: language,
      fallbackLng: false,
      resources: { [language]: { translation } },
    });
    const missing: string[] = [];
    for (const key of pluralKeys) {
      for (const count of [0, 1, 2, 3, 5, 11, 21, 101]) {
        if (!instance.exists(key, { count })) missing.push(`${key}: ${count}`);
      }
    }
    expect(missing).toEqual([]);
  });
}
