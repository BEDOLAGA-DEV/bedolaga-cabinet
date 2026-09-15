import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Отмеченный оператором вариант выглядит одинаково на всех витринах: плашка
 * «Выгодно» первой строкой карточки и золотая рамка. Раньше каждая витрина
 * рисовала своё — в продлении рамка и плашка сверху, в подарке и на лендинге
 * плашка посреди текста и без рамки, в покупке — внизу.
 */
const SRC = join(__dirname, '..', '..');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') && !path.includes('.test.') ? [path] : [];
  });
}

const showcases = tsxFiles(SRC)
  .filter((path) => !path.endsWith('BestValueBadge.tsx'))
  .map((path) => ({ path: relative(SRC, path), code: readFileSync(path, 'utf8') }))
  .filter(({ code }) => code.includes('<BestValueBadge'));

describe('плашка «Выгодно» на витринах', () => {
  it('витрины найдены', () => {
    expect(showcases.length).toBeGreaterThanOrEqual(5);
  });

  it.each(showcases.map((s) => [s.path, s.code]))(
    '%s: у отмеченного варианта общая золотая рамка',
    (_path, code) => {
      expect(/bestValueFrame\(|BEST_VALUE_BORDER/.test(code)).toBe(true);
    },
  );

  it.each(showcases.map((s) => [s.path, s.code]))(
    '%s: плашка не прижата вниз карточки',
    (_path, code) => {
      expect(/<BestValueBadge[^>]*className="[^"]*\bmt-/.test(code)).toBe(false);
    },
  );
});
