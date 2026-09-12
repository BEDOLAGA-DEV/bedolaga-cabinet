import { useQuery } from '@tanstack/react-query';
import { type GeoCatalogParams, type GeoNetwork, reachabilityApi } from '@/api/reachability';

export const REACHABILITY_GEO_CATALOG_KEY = 'admin-reachability-geo-catalog';
/** Справочник у бота кэшируется десять минут — держим столько же, чтобы не дёргать его зря. */
const CATALOG_STALE_MS = 600_000;
/** Поиск города — от двух букв: одна буква даёт сотни совпадений. */
const MIN_QUERY_LENGTH = 2;

/** Справочные списки: округа, регионы, провайдеры. */
export function useGeoCatalog(network: GeoNetwork) {
  return useQuery({
    queryKey: [REACHABILITY_GEO_CATALOG_KEY, network],
    queryFn: () => reachabilityApi.getGeoCatalog({ network }),
    staleTime: CATALOG_STALE_MS,
  });
}

/** Поиск города по названию: ответ до 500 городов с провайдерами и признаком «показаны не все». */
export function useGeoCitySearch(network: GeoNetwork, q: string) {
  const query = q.trim();
  const params: GeoCatalogParams = { network, q: query };
  return useQuery({
    queryKey: [REACHABILITY_GEO_CATALOG_KEY, network, 'city', query],
    queryFn: () => reachabilityApi.getGeoCatalog(params),
    enabled: query.length >= MIN_QUERY_LENGTH,
    staleTime: CATALOG_STALE_MS,
  });
}
