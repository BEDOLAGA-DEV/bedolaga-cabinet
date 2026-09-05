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

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Подсеть /24 для скана: из IP или CIDR /24; домены и другие маски не годятся. */
export function scanSubnet(input: string): string | null {
  const value = input.trim();
  const [address, mask] = value.split('/');
  if (mask !== undefined && mask !== '24') return null;
  const match = IPV4.exec(address);
  if (!match) return null;
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((octet) => octet > 255)) return null;
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}
