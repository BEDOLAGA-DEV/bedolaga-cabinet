import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import Twemoji from './twemoji';

const SRC = join(__dirname, '..');
const WRAPPER = 'lib/twemoji.ts';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('twemoji', () => {
  it('отдаёт сам компонент, а не объект CommonJS-модуля', () => {
    expect(typeof Twemoji).toBe('function');
    expect((Twemoji as unknown as { default?: unknown }).default).toBeUndefined();
  });

  // vitest разворачивает CJS-default сам, поэтому поломку ловит только сборка:
  // прямой импорт 'react-twemoji' в продакшене даёт объект модуля и React #130.
  it('react-twemoji импортируется только через обёртку', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => relative(SRC, file) !== WRAPPER)
      .filter((file) => /from ['"]react-twemoji['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
