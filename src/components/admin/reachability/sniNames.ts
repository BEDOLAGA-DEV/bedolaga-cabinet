/**
 * Какие имена уйдут в TLS-SNI — то же правило, что в боте (``requests.sni_hosts_for``):
 * SNI цели, а без него её домен; у голого IP имени нет (RFC 6066). Бот остаётся судьёй,
 * здесь — чтобы показать имена до запуска.
 */

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export interface SniSource {
  address: string;
  sni: string | null;
}

export function isIpLiteral(host: string): boolean {
  return IPV4.test(host) || host.includes(':');
}

export function sniNameFor(item: SniSource): string | null {
  const sni = (item.sni ?? '').trim().toLowerCase();
  if (sni) return sni;
  const address = item.address.trim().toLowerCase();
  return !address || isIpLiteral(address) ? null : address;
}

export function sniNamesFor(items: SniSource[]): string[] {
  const names = items.map(sniNameFor).filter((name): name is string => name !== null);
  return [...new Set(names)].sort();
}

/** Хост из строки «IP / домен»: схема, путь и порт отбрасываются. */
export function hostnameOf(value: string): string {
  const withoutScheme = value.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const hostPort = withoutScheme.split(/[/?#]/)[0] ?? '';
  return hostPort.replace(/:\d+$/, '');
}

export function sniNamesForAddresses(values: string[]): string[] {
  return sniNamesFor(values.map((value) => ({ address: hostnameOf(value), sni: null })));
}
