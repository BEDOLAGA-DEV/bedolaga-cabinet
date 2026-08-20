import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

/**
 * Dev-only витрина скелетонов: /__skeletons. В прод-сборку не попадает —
 * маршрут в App.tsx закрыт проверкой import.meta.env.DEV.
 */
export default function SkeletonGallery() {
  return (
    <div className="min-h-dvh space-y-8 bg-dark-950 p-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-dark-100">line внутри карточки</h2>
        <div className="space-y-4 rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6">
          <SkeletonGroup className="flex items-center gap-3">
            <Skeleton circle className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </SkeletonGroup>
          <SkeletonGroup className="space-y-2">
            <Skeleton count={3} className="h-3" />
          </SkeletonGroup>
          <p className="text-base text-dark-100">
            Авторазмер внутри текста: <Skeleton className="inline-block w-24 align-middle" />
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-dark-100">card на фоне страницы</h2>
        <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton variant="card" className="h-36" />
          <Skeleton variant="card" className="h-36" />
        </SkeletonGroup>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-dark-100">animate=false</h2>
        <SkeletonGroup className="space-y-2">
          <Skeleton animate={false} className="h-4 w-40" />
          <Skeleton animate={false} variant="card" className="h-20" />
        </SkeletonGroup>
      </section>
    </div>
  );
}
