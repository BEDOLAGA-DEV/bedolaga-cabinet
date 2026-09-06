import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ParsedInput, type SubscriptionConfigs, reachabilityApi } from '@/api/reachability';

export const REACHABILITY_HOSTS_KEY = 'admin-reachability-hosts';
export const REACHABILITY_NODES_KEY = ['admin-reachability-nodes'] as const;
export const REACHABILITY_SUBSCRIPTION_KEY = 'admin-reachability-subscription';
export const REACHABILITY_PARSE_KEY = 'admin-reachability-parse';
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

/**
 * Конфиги подписки: пользователя, если задан, иначе подписки по умолчанию (или переданного
 * shortUuid). `enabled: false` — источника нет вовсе (подписка по умолчанию не задана):
 * запрос не уходит, объяснение даёт SubscriptionSourcePicker, а не ошибка API.
 */
export function useSubscriptionConfigs(
  userId: number | null,
  shortUuid: string | null,
  enabled = true,
) {
  return useQuery<SubscriptionConfigs>({
    queryKey: [REACHABILITY_SUBSCRIPTION_KEY, userId, shortUuid],
    queryFn: () =>
      reachabilityApi.getSubscriptionConfigs({
        userId: userId ?? undefined,
        shortUuid: shortUuid ?? undefined,
      }),
    staleTime: 60_000,
    retry: false,
    enabled,
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

/**
 * Поле «Конфиг или подписка»: бот разбирает ссылки, URL подписок и base64 и отдаёт конфиги
 * с готовыми целями. Пустой текст — запрос не уходит.
 */
export function useParsedInput(text: string) {
  const rawInput = text.trim();
  return useQuery<ParsedInput>({
    queryKey: [REACHABILITY_PARSE_KEY, rawInput],
    queryFn: () => reachabilityApi.parseInput(rawInput),
    enabled: rawInput.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}
