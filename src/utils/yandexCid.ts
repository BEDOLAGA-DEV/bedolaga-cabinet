/** Reads Yandex Metrika CID from localStorage (set by useAnalyticsCounters). */
export function getYandexCid(): string | null {
  try {
    return localStorage.getItem('yandex_cid');
  } catch {
    return null;
  }
}
