import { useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store/auth';
import { safeLocal } from '@/utils/safeStorage';
import {
  availableMirrors,
  selectedMirrorUrl,
  type MirrorConnection,
} from '@/utils/subscriptionMirrors';
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
export function useSubscriptionMirror(
  data: MirrorConnection | undefined,
  main: string | null,
  hidden = false,
) {
  const userId = useAuthStore((state) => state.user?.id);
  const key =
    userId && data?.subscription_id
      ? `subscription-mirror:${userId}:${data.subscription_id}`
      : null;
  const stored = useSyncExternalStore(
    subscribe,
    () => (key ? safeLocal.getItem(key) : null),
    () => null,
  );
  const mirrors = key ? availableMirrors(data, hidden) : [];
  const selectedId = mirrors.some((mirror) => mirror.id === stored) ? stored : null;
  const select = (id: string | null) => {
    if (!key || (id !== null && !mirrors.some((mirror) => mirror.id === id))) return;
    if (id) safeLocal.setItem(key, id);
    else safeLocal.removeItem(key);
    for (const listener of listeners) listener();
  };
  return { mirrors, selectedId, select, url: selectedMirrorUrl(main, mirrors, selectedId) };
}
export type SubscriptionMirrorSelection = ReturnType<typeof useSubscriptionMirror>;
