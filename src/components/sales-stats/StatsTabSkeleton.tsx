import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

/**
 * Заглушка вкладки статистики. Общая для всех шести вкладок sales-stats —
 * до консолидации это были шесть посимвольно одинаковых копий.
 */
export function StatsTabSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup className="space-y-4">
      <Skeleton variant="card" count={count} className="h-24 rounded-xl" />
    </SkeletonGroup>
  );
}
