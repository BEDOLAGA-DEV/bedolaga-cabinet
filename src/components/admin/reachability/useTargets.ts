import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type SubscriptionConfigs, reachabilityApi } from '@/api/reachability';

export const REACHABILITY_HOSTS_KEY = 'admin-reachability-hosts';
export const REACHABILITY_NODES_KEY = ['admin-reachability-nodes'] as const;
export const REACHABILITY_SUBSCRIPTION_KEY = 'admin-reachability-subscription';
export const REACHABILITY_SUMMARY_KEY = 'admin-reachability-summary';

export function useHosts(includeDisabled = false) {
  return useQuery({
    queryKey: [REACHABILITY_HOSTS_KEY, includeDisabled],
    queryFn: () => reachabilityApi.getHosts(includeDisabled),
    staleTime: 60_000,
  });
}

export function useNodes() {
  return useQuery({
    queryKey: REACHABILITY_NODES_KEY,
    queryFn: () => reachabilityApi.getNodes(),
    staleTime: 60_000,
  });
}

/** Конфиги подписки: пользователя, если задан, иначе эталонной (или переданного shortUuid). */
export function useSubscriptionConfigs(userId: number | null, shortUuid: string | null) {
  return useQuery<SubscriptionConfigs>({
    queryKey: [REACHABILITY_SUBSCRIPTION_KEY, userId, shortUuid],
    queryFn: () =>
      reachabilityApi.getSubscriptionConfigs({
        userId: userId ?? undefined,
        shortUuid: shortUuid ?? undefined,
      }),
    staleTime: 60_000,
    retry: false,
  });
}

/** Назначение/исключение меняет и списки хостов, и сводку. */
export function useInvalidateTargets() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [REACHABILITY_HOSTS_KEY] });
    queryClient.invalidateQueries({ queryKey: [REACHABILITY_SUMMARY_KEY] });
  };
}
