import type { Purpose } from '@/api/reachability';

/** Быстрый выбор целей по назначению — хосты панели и конфиги подписки под Белый список. */
export function pickByPurpose<T extends { purpose: Purpose }>(items: T[], purpose: Purpose): T[] {
  return items.filter((item) => item.purpose === purpose);
}
