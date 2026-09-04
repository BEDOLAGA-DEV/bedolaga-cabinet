/**
 * Подсказка первой отрисовки для палитры оператора.
 *
 * Цвета приходят с бэкенда уже после загрузки JS, и каждая загрузка сначала
 * показывала палитру по умолчанию, а потом прыгала в операторскую. Здесь хранится
 * последняя применённая палитра: `vars` — готовые CSS-переменные для :root, их
 * ставит инлайн-скрипт index.html до загрузки приложения; `colors` — цвета, как
 * их отдал бэкенд, с них стартует react-query до ответа сервера.
 *
 * Читаем недоверчиво: localStorage могла записать другая версия приложения.
 * Принимаются только имена `--color-*` со значением hex или RGB-триплет — те же
 * проверки повторяет инлайн-скрипт.
 */
import { STORAGE_KEYS } from '@/config/constants';
import { DEFAULT_THEME_COLORS, type ThemeColors } from '@/types/theme';
import { safeLocal } from './safeStorage';

export interface ThemeColorsHint {
  colors: ThemeColors;
  vars: Record<string, string>;
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const VAR_NAME = /^--color-[a-z0-9-]+$/;
const VAR_VALUE = /^(#[0-9a-f]{6}|\d{1,3}, \d{1,3}, \d{1,3})$/i;
const COLOR_KEYS = Object.keys(DEFAULT_THEME_COLORS) as (keyof ThemeColors)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseColors(raw: unknown): ThemeColors | null {
  if (!isRecord(raw)) return null;
  const entries = COLOR_KEYS.map((key) => [key, raw[key]] as const);
  if (!entries.every(([, value]) => typeof value === 'string' && HEX_COLOR.test(value))) {
    return null;
  }
  return Object.fromEntries(entries) as unknown as ThemeColors;
}

function parseVars(raw: unknown): Record<string, string> | null {
  if (!isRecord(raw)) return null;
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] =>
        VAR_NAME.test(entry[0]) && typeof entry[1] === 'string' && VAR_VALUE.test(entry[1]),
    ),
  );
}

export function readThemeColorsHint(): ThemeColorsHint | null {
  const raw = safeLocal.getJson<unknown>(STORAGE_KEYS.THEME_COLORS_HINT, null);
  if (!isRecord(raw)) return null;
  const colors = parseColors(raw.colors);
  const vars = parseVars(raw.vars);
  if (!colors || !vars) return null;
  return { colors, vars };
}

export function writeThemeColorsHint(hint: ThemeColorsHint): void {
  // Ответ бэкенда несёт служебные поля (id, updated_at) — в подсказку идут только цвета.
  const colors = Object.fromEntries(COLOR_KEYS.map((key) => [key, hint.colors[key]]));
  safeLocal.setJson(STORAGE_KEYS.THEME_COLORS_HINT, { colors, vars: hint.vars });
}
