import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Иконки — только из баррели `@/components/icons` (Phosphor, Regular).
 *
 * Миграция на Phosphor пропустила 37 рукописных `<svg>`. Одна из них, «Перевыпустить
 * подписку», была копией heroicons с потерянным хвостом контура — стрелка рисовалась
 * разорванной, и это заметили пользователи, а не проверки. Список ниже — места, где
 * `<svg>` законен: логотипы брендов, спиннеры, графики, декоративные фоны и сама
 * барреля. Новый файл в нём — осознанное решение, а не случайность.
 */

const SRC = join(import.meta.dirname, '..', '..');

const ALLOWED = new Set([
  'components/icons/index.tsx', // RemnawaveIcon — логотип панели
  'components/icons/LandingIcons.tsx',
  'components/OAuthProviderIcon.tsx',
  'components/PaymentMethodIcon.tsx',
  'components/ProviderIcon.tsx',
  'components/TelegramLoginButton.tsx',
  'pages/TelegramRedirect.tsx', // логотип Telegram
  'pages/AdminBanSystem.tsx', // логотип Telegram
  'components/primitives/Button/Button.tsx', // спиннер
  'pages/AdminPayments.tsx', // спиннер
  'components/wheel/FortuneWheel.tsx',
  'components/dashboard/Sparkline.tsx',
  'components/admin/reachability/GeoMap.tsx',
  'components/admin/dpichecker/DpiRegionMap.tsx', // карта регионов, не иконка
  'components/ui/backgrounds/background-beams.tsx',
  'components/ui/backgrounds/background-gradient-animation.tsx',
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('иконки', () => {
  it('рукописный <svg> только в разрешённых местах', () => {
    const offenders = sourceFiles(SRC)
      .map((path) => relative(SRC, path))
      .filter((path) => !ALLOWED.has(path))
      .filter((path) => /<svg\b/.test(readFileSync(join(SRC, path), 'utf-8')));

    expect(offenders).toEqual([]);
  });
});
