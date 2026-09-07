import type { LaunchMode } from './deepLink';

/**
 * Одно поле на странице флота: вкладка одиночной проверки выбирается по тому, что вставили.
 * Ссылка конфига или подписки — «Подписка», одна подсеть /24 — «CIDR», остальное — «IP / домен».
 */

const CONFIG_SCHEME = /^(vless|vmess|trojan|ss|hysteria2?|hy2|tuic):\/\//i;
const CIDR = /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/;
const HTTP_URL = /^https?:\/\/[^/\s]+(\/\S*)?$/i;
/** Подписка целиком в base64: длинная строка без точек и пробелов. */
const BASE64_BLOB = /^[A-Za-z0-9+/=_-]{40,}$/;

function isSubscriptionUrl(line: string): boolean {
  const match = HTTP_URL.exec(line);
  if (!match) return false;
  const path = match[1] ?? '';
  return path.length > 1;
}

export function splitCheckInput(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function detectCheckMode(text: string): LaunchMode {
  const lines = splitCheckInput(text);
  if (lines.length === 0) return 'ip';
  if (lines.some((line) => CONFIG_SCHEME.test(line))) return 'vless';
  if (lines.length === 1 && CIDR.test(lines[0])) return 'cidr';
  if (lines.some(isSubscriptionUrl)) return 'vless';
  if (lines.length === 1 && BASE64_BLOB.test(lines[0]) && !lines[0].includes('.')) return 'vless';
  return 'ip';
}
