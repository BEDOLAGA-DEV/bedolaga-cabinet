import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// .../src/components/ui/skeleton/ -> .../src/
const SRC_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const SKELETON_DIR = join(SRC_ROOT, 'components', 'ui', 'skeleton') + sep;
const GLOBALS_CSS = join(SRC_ROOT, 'styles', 'globals.css');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * Строковые литералы файла. Обычные кавычки и шаблонные строки разбираются
 * отдельно, а из шаблонных вырезаются ${...}-вставки: иначе внешний литерал
 * вида `... ${cond ? 'animate-pulse bg-success-500' : 'bg-dark-500'}` выглядел
 * бы как один литерал с обоими маркерами и давал ложное срабатывание на
 * легальных статус-точках нод (AdminBanSystem, AdminDashboard).
 */
function stringLiterals(source: string): string[] {
  const quoted = source.match(/'[^'\n]*'|"[^"\n]*"/g) ?? [];
  const templates = (source.match(/`[^`]*`/g) ?? []).map((tpl) => tpl.replace(/\$\{[^}]*\}/g, ' '));
  return [...quoted, ...templates];
}

/**
 * Сигнатура инлайнового скелетона: пульс и заливка из палитры dark-* в ОДНОМ
 * литерале. Статус-точки (`animate-pulse bg-success-500`), тинт при загрузке
 * (одиночный `animate-pulse`) и декоративные пульсации под неё не попадают.
 */
function hasInlineSkeleton(source: string): boolean {
  return stringLiterals(source).some(
    (literal) => literal.includes('animate-pulse') && literal.includes('bg-dark-'),
  );
}

/**
 * Второй, ранее незамеченный механизм: CSS-класс .skeleton из globals.css,
 * прятавший animate-pulse за @apply. Он давал контраст 1.06 в тёмной теме и
 * 1.19 в светлой — то есть был почти невидим — и его не находил поиск по
 * animate-pulse. Класс удалён, здесь стоит защита от возврата.
 */
function usesSkeletonCssClass(source: string): boolean {
  return stringLiterals(source).some((literal) => /(^|[\s'"`])skeleton(\s|['"`]$)/.test(literal));
}

describe('скелетоны загрузки', () => {
  it('не верстаются инлайном — только через @/components/ui/skeleton', () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) => !file.startsWith(SKELETON_DIR))
      .filter((file) => hasInlineSkeleton(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC_ROOT, file));

    expect(offenders).toEqual([]);
  });

  it('ловит инлайновую разметку', () => {
    expect(
      hasInlineSkeleton('<div className="h-4 w-32 animate-pulse rounded bg-dark-700" />'),
    ).toBe(true);
  });

  it('не трогает пульсирующие статус-точки нод', () => {
    // Фикстура собрана шаблонной строкой: обычная строка с ${ внутри
    // запрещена правилом biome noTemplateCurlyInString.
    const dot = `className={\`h-3 w-3 rounded-full \${node.is_connected ? "animate-pulse bg-success-500" : "bg-dark-500"}\`}`;
    expect(hasInlineSkeleton(dot)).toBe(false);
  });

  it('не использует CSS-класс .skeleton — он удалён из globals.css', () => {
    const offenders = walk(SRC_ROOT)
      .filter((file) => !file.startsWith(SKELETON_DIR))
      .filter((file) => usesSkeletonCssClass(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC_ROOT, file));

    expect(offenders).toEqual([]);
  });

  it('класс .skeleton не объявлен в globals.css', () => {
    expect(readFileSync(GLOBALS_CSS, 'utf8')).not.toMatch(/^\s*\.skeleton\s*\{/m);
  });

  it('ловит возврат CSS-класса', () => {
    expect(usesSkeletonCssClass('<div className="skeleton h-8 w-32" />')).toBe(true);
    expect(usesSkeletonCssClass('<Skeleton className="h-8 w-32" />')).toBe(false);
  });

  it('не трогает одиночный animate-pulse как тинт при загрузке', () => {
    expect(hasInlineSkeleton("cn('rounded-xl bg-dark-800', isLoading && 'animate-pulse')")).toBe(
      false,
    );
  });
});
