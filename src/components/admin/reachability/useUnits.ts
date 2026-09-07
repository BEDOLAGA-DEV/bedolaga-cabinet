import { useQuery } from '@tanstack/react-query';
import { reachabilityApi } from '@/api/reachability';

export const REACHABILITY_UNITS_KEY = ['admin-reachability-units'] as const;

/** Каталог симок операторов; флот меняется, поэтому кэш недолгий. */
export function useUnits() {
  return useQuery({
    queryKey: REACHABILITY_UNITS_KEY,
    queryFn: () => reachabilityApi.getUnits({ dpi: 'any' }),
    staleTime: 60_000,
  });
}
