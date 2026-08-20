import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

interface ListRowAction {
  /** Класс ширины кнопки-заглушки, например 'w-8'. */
  width: string;
  /** Кнопка-пилюля вместо квадратной иконки. */
  pill?: boolean;
}

interface ListRowSkeletonProps {
  /** Сколько строк-заглушек отрисовать. */
  count?: number;
  /** Набор кнопок справа: у новостей три действия, у инфостраниц два. */
  actions?: ListRowAction[];
}

const DEFAULT_ACTIONS: ListRowAction[] = [{ width: 'w-14', pill: true }, { width: 'w-8' }];

/**
 * Заглушка списка админских карточек. Общая для AdminNews и AdminInfoPages —
 * до консолидации это были две посимвольно одинаковые копии, отличавшиеся
 * только набором кнопок справа.
 *
 * Оформление контейнера повторяет реальную строку списка (та же рамка, фон и
 * радиус), поэтому при появлении данных карточка не меняет габариты.
 */
export function ListRowSkeleton({ count = 3, actions = DEFAULT_ACTIONS }: ListRowSkeletonProps) {
  return (
    <SkeletonGroup className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16 shrink-0" />
                <Skeleton className="h-4 w-12 shrink-0" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex gap-2">
              {actions.map((action, j) => (
                <Skeleton
                  key={j}
                  className={`h-8 shrink-0 ${action.width} ${action.pill ? 'rounded-full' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
