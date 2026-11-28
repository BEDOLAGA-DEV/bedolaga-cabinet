import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/api/subscription';
import { useSubscriptionMirror } from '@/hooks/useSubscriptionMirror';
import { MirrorSelector } from './MirrorSelector';
/** Used beside entry points which do not otherwise load connection details. */
export function SubscriptionMirrorSelector({
  subscriptionId,
  hidden = false,
}: {
  subscriptionId: number;
  hidden?: boolean;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const { data } = useQuery({
    queryKey: ['connection-link', subscriptionId, userId],
    queryFn: () => subscriptionApi.getConnectionLink(subscriptionId),
    enabled: !hidden,
    retry: false,
  });
  const selection = useSubscriptionMirror(data, data?.subscription_url ?? null, hidden);
  return <MirrorSelector selection={selection} />;
}
