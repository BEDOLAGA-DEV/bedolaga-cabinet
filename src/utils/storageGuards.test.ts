import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Храповик против незащищённого доступа к web storage.
 *
 * Обращение к localStorage/sessionStorage может не вернуть null, а БРОСИТЬ:
 * приватный режим Safari, настройка «блокировать данные сайтов», встроенные
 * вебвью. Бросок в фазе рендера у корня дерева кладёт всё приложение — так и
 * было с useTheme, useOnboarding и saveReturnUrl, пока их не перевели на
 * src/utils/safeStorage.ts.
 *
 * Тест не требует переписывать уже защищённые обращения: он ловит ровно тот
 * класс, который опасен, — обращение к глобалу ВНЕ try-блока. Список исключений
 * для этого поддерживать не нужно, поэтому храповик не протухает.
 */

// .../src/utils/ -> .../src/
const SRC_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Канонические места, которым голый доступ положен по существу. */
const ALLOWED = ['utils/safeStorage.ts', 'test/setup.ts'];

const STORAGE_NAMES = new Set(['localStorage', 'sessionStorage']);
/** Объекты, у которых свойство с таким именем — тот самый глобал. */
const GLOBAL_HOLDERS = new Set(['window', 'globalThis', 'self', 'top', 'parent']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Лежит ли узел внутри try-блока — именно try, не catch и не finally. */
function insideTryBlock(node: ts.Node, source: ts.SourceFile): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (
      ts.isTryStatement(parent) &&
      parent.tryBlock.getStart(source) <= node.getStart(source) &&
      node.getEnd() <= parent.tryBlock.getEnd()
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Ссылка ли это на глобальное хранилище.
 *
 * Ловится сам идентификатор, а не форма вызова: так под правило разом попадают
 * `localStorage.getItem()`, `localStorage?.getItem()`, `window.localStorage`,
 * `const s = localStorage`, `const { getItem } = localStorage` и
 * `globalThis['localStorage']`. Отсеиваются свойства чужих объектов
 * (`adapter.localStorage`) и ключи объектных литералов.
 */
function isStorageGlobalReference(node: ts.Node, source: ts.SourceFile): boolean {
  if (ts.isStringLiteral(node) && STORAGE_NAMES.has(node.text)) {
    const parent = node.parent;
    return (
      !!parent &&
      ts.isElementAccessExpression(parent) &&
      parent.argumentExpression === node &&
      GLOBAL_HOLDERS.has(parent.expression.getText(source))
    );
  }

  if (!ts.isIdentifier(node) || !STORAGE_NAMES.has(node.text)) return false;

  const parent = node.parent;
  if (!parent) return true;
  // Ключ объектного литерала или имя свойства в типе — не обращение к глобалу.
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent)) return false;
  // `foo.localStorage` — глобал только если foo это window/globalThis/self.
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return GLOBAL_HOLDERS.has(parent.expression.getText(source));
  }
  return true;
}

/** Все незащищённые обращения к web storage в дереве `root`. */
function unguardedStorageAccesses(root: string): string[] {
  const offenders: string[] = [];

  for (const file of walk(root)) {
    const relPath = relative(root, file).split(sep).join('/');
    if (ALLOWED.includes(relPath)) continue;

    const text = readFileSync(file, 'utf8');
    if (!text.includes('localStorage') && !text.includes('sessionStorage')) continue;

    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node: ts.Node): void => {
      if (isStorageGlobalReference(node, source) && !insideTryBlock(node, source)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        offenders.push(`${relPath}:${line + 1} — ${text.split('\n')[line].trim()}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return offenders;
}

describe('доступ к web storage', () => {
  it('нигде не выполняется голым и без try/catch', () => {
    const offenders = unguardedStorageAccesses(SRC_ROOT);

    expect(
      offenders,
      'Обращение к storage может бросить SecurityError. Используйте safeLocal/safeSession ' +
        'из @/utils/safeStorage либо оберните вызов в try/catch:\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });
});

describe('сам храповик', () => {
  /**
   * Страховка от «зелёного вхолостую»: канарейка обязана идти через ТУ ЖЕ
   * функцию, что и рабочий тест. Иначе поломка обхода (пустой список файлов,
   * сломанный парсер) сделала бы основной тест вечно зелёным.
   */
  function withFixture(files: Record<string, string>, run: (root: string) => void) {
    const root = mkdtempSync(join(tmpdir(), 'storage-guard-'));
    try {
      for (const [name, content] of Object.entries(files)) writeFileSync(join(root, name), content);
      run(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it.each([
    ['прямой вызов', 'export const v = localStorage.getItem("k");'],
    ['optional chaining', 'export const v = localStorage?.getItem("k");'],
    ['через window', 'export const v = window.sessionStorage.getItem("k");'],
    ['алиас в переменной', 'const s = localStorage;\nexport const v = s.getItem("k");'],
    ['деструктуризация', 'const { getItem } = localStorage;\nexport const v = getItem("k");'],
    ['доступ по строковому ключу', 'export const v = globalThis["localStorage"];'],
    [
      'внутри catch, а не try',
      'export function f() {\n  try {\n    JSON.parse("{}");\n  } catch {\n    localStorage.removeItem("k");\n  }\n}',
    ],
  ])('ловит нарушение: %s', (_name, code) => {
    withFixture({ 'offender.ts': code }, (root) => {
      expect(unguardedStorageAccesses(root)).not.toEqual([]);
    });
  });

  it.each([
    [
      'обращение внутри try',
      'export function f() {\n  try {\n    localStorage.setItem("k", "v");\n  } catch {}\n}',
    ],
    [
      'свойство чужого объекта',
      'declare const adapter: { localStorage: string };\nexport const v = adapter.localStorage;',
    ],
    ['ключ объектного литерала', 'export const cfg = { localStorage: "off" };'],
  ])('не ругается зря: %s', (_name, code) => {
    withFixture({ 'clean.ts': code }, (root) => {
      expect(unguardedStorageAccesses(root)).toEqual([]);
    });
  });

  it('сообщает файл и строку нарушителя', () => {
    withFixture(
      { 'offender.ts': '// строка 1\nexport const v = localStorage.getItem("k");' },
      (root) => {
        expect(unguardedStorageAccesses(root)).toEqual([expect.stringContaining('offender.ts:2')]);
      },
    );
  });
});
