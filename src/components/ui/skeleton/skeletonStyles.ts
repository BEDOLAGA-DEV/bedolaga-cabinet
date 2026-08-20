import { cn } from '@/lib/utils';

export type SkeletonVariant = 'line' | 'card';

/**
 * Единственный источник правды по внешнему виду скелетонов загрузки.
 *
 * До консолидации кабинет заливал одну и ту же роль семью разными способами
 * (bg-dark-700, /50, /60, bg-dark-800, /30, /40, /50). Вариантов ровно два,
 * потому что реальных ролей в коде было ровно две:
 *   line — плейсхолдер контента ВНУТРИ карточки, контраст к bg-dark-900/70;
 *   card — плейсхолдер САМОЙ карточки на фоне страницы, поэтому с рамкой.
 *
 * Цвета — токены dark-*, они уже завязаны на --color-dark-* и перекрашиваются
 * под тему через applyThemeColors, поэтому светлая и кастомные темы работают
 * без отдельных веток.
 */
const VARIANT_FILL: Record<SkeletonVariant, string> = {
  line: 'bg-dark-700/50',
  card: 'border border-dark-700/30 bg-dark-800/40',
};

/** Радиусы по канону CLAUDE.md:134-137: строки — lg, внутренние панели — 2xl. */
const VARIANT_RADIUS: Record<SkeletonVariant, string> = {
  line: 'rounded-lg',
  card: 'rounded-2xl',
};

export interface SkeletonClassOptions {
  variant?: SkeletonVariant;
  /** Круглый плейсхолдер — аватар, точка, иконка. */
  circle?: boolean;
  /** Отключить пульсацию (например, для статичного макета). */
  animate?: boolean;
  /** Классы вызывающей стороны. Перекрывают дефолты через twMerge. */
  className?: string;
}

export function skeletonClass({
  variant = 'line',
  circle = false,
  animate = true,
  className,
}: SkeletonClassOptions = {}): string {
  return cn(
    // shrink-0 намеренно НЕ в дефолтах: в узких flex-рядах (подвал подписки
    // на маленьком экране Mini App) он запретил бы сжатие и вызвал переполнение.
    // Где нужно — добавляется через className, как было в исходном коде.
    'block',
    // Авторазмер в духе react-loading-skeleton: без явных классов размера
    // строка повторяет высоту текста родителя и тянется на всю ширину.
    // Любой h-*/w-* в className это перекрывает — cn построен на twMerge.
    'h-[1em] w-full',
    VARIANT_FILL[variant],
    circle ? 'rounded-full' : VARIANT_RADIUS[variant],
    animate && 'animate-pulse',
    className,
  );
}
