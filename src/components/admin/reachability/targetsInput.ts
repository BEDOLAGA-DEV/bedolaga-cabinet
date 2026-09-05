/** Поле «Свои адреса»: IP, домен или адрес:порт, через запятую или с новой строки. */

export const MAX_CUSTOM_TARGETS = 10;

export interface ParsedTargets {
  targets: string[];
  /** Сколько целей сверх лимита отброшено. */
  overLimit: number;
}

export function parseTargets(text: string): ParsedTargets {
  const unique = [
    ...new Set(
      text
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  return {
    targets: unique.slice(0, MAX_CUSTOM_TARGETS),
    overLimit: Math.max(0, unique.length - MAX_CUSTOM_TARGETS),
  };
}
