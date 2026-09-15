import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Знак валюты приклеен к сумме неразрывным пробелом. С обычным пробелом узкая
 * плитка или строка переносила «₽» отдельной строкой под «1 234 567,89». Внутри
 * числа Intl и так ставит неразрывные пробелы — рвался только стык с символом.
 */
const SRC = join(__dirname, '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx?|ts)$/.test(path) && !path.includes('.test.') ? [path] : [];
  });
}

// И буквальный знак после выражения: «{price} ₽» в разметке и `${price} ₽` в строке —
// прошлый сторож их не видел, в админке таких мест было полсотни.
const BREAKABLE = [/\} \{currencySymbol\}/, / \$\{currencySymbol\}/, /\} ₽/];

describe('сумма и знак валюты не разрываются', () => {
  it('нигде нет обычного пробела перед currencySymbol', () => {
    const offenders = sources(SRC).flatMap((path) =>
      readFileSync(path, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${relative(SRC, path)}:${i + 1}` }))
        .filter(({ line }) => BREAKABLE.some((re) => re.test(line)))
        .map(({ at }) => at),
    );
    expect(offenders).toEqual([]);
  });

  it('в переводах знак приклеен к подстановке суммы', () => {
    const offenders = readdirSync(join(SRC, 'locales'))
      .filter((name) => name.endsWith('.json'))
      .flatMap((name) =>
        readFileSync(join(SRC, 'locales', name), 'utf8')
          .split('\n')
          .map((line, i) => ({ line, at: `locales/${name}:${i + 1}` }))
          .filter(({ line }) => /\}\} ₽/.test(line))
          .map(({ at }) => at),
      );
    expect(offenders).toEqual([]);
  });
});
