import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Текст нельзя красить прозрачностью.
 *
 * Отчёт владельца 2026-09-08: «большинство текста как будто серый и блеклый и
 * его не видно на некоторых темах». Причина была не в палитре, а в том, что
 * подписи красили долей основного цвета: `text-dark-50/25`, `text-success-400/70`,
 * `opacity-60` на строке текста. Замер давал 2.7–4.3 при норме 4.5.
 *
 * Доля основного цвета не участвует в контрастном клампе `applyThemeColors`,
 * поэтому на тёмной операторской палитре она проваливается молча. Вторичный
 * текст обязан брать готовые токены: dark-400 (кламп 5.0) и dark-500 (кламп 4.5).
 */

const SRC = join(__dirname, '..');

// Прозрачный текст: доля основного цвета или статусного шейда.
const ALPHA_TEXT =
  /\btext-(dark-50|white|success-\d+|error-\d+|warning-\d+|accent-\d+)\/([0-9]{1,2})\b/g;
const ALPHA_LIMIT = 50;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : walk(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('читаемость текста', () => {
  it('вторичный текст не красится прозрачностью основного цвета', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(ALPHA_TEXT)) {
        if (Number(match[2]) < ALPHA_LIMIT) {
          offenders.push(`${file.replace(SRC, 'src')}: ${match[0]}`);
        }
      }
    }
    expect(
      offenders,
      'возьмите text-dark-400 или text-dark-500 — они клампятся по контрасту',
    ).toEqual([]);
  });

  it('светлая тема держит статусный текст на тёмных шейдах', () => {
    const css = readFileSync(join(SRC, 'styles/globals.css'), 'utf8');
    for (const name of ['accent', 'success', 'warning', 'error']) {
      expect(css).toContain(`--color-${name}-400: var(--color-${name}-800) !important;`);
    }
  });
});
