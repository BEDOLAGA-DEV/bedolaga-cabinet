import { useQuery } from '@tanstack/react-query';
import { type JobCreateRequest, type PreviewResponse, reachabilityApi } from '@/api/reachability';

export const REACHABILITY_PREVIEW_KEY = 'admin-reachability-preview';

/** Бесплатный расчёт: симки, пропуски, цена. Пересчитывается на каждое изменение тела запроса. */
export function useJobPreview(body: JobCreateRequest | null) {
  return useQuery<PreviewResponse>({
    queryKey: [REACHABILITY_PREVIEW_KEY, body],
    queryFn: () => reachabilityApi.previewJob(body as JobCreateRequest),
    enabled: Boolean(body && body.targets.length > 0),
    staleTime: 0,
    retry: false,
  });
}
