import { useQuery } from '@tanstack/react-query';
import { type ReachabilityStatus, reachabilityApi } from '@/api/reachability';

export const REACHABILITY_STATUS_KEY = ['admin-reachability-status'] as const;

/** Статус интеграции: баланс, тариф, занятость. Обновляется редко и после завершения задач. */
export function useReachabilityStatus(enabled = true) {
  return useQuery<ReachabilityStatus>({
    queryKey: REACHABILITY_STATUS_KEY,
    queryFn: reachabilityApi.getStatus,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

/** Для ярлыков на чужих страницах: показывать кнопку только при включённой интеграции. */
export function useReachabilityAvailable(): boolean {
  const { data } = useReachabilityStatus();
  return Boolean(data?.enabled && data?.configured);
}
