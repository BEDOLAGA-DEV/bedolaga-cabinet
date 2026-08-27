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
 * Заливка взята от dark-500, а не от dark-700, по замерам контраста в браузере.
 * Шкала dark-* семантическая: 50 — цвет текста, 950 — фон, а 600/700 — сырые
 * интерполяции в сторону поверхности, из-за чего их контраст разъезжается между
 * темами. dark-500 — readability-скорректированный hint-цвет с гарантированным
 * отступом от поверхности, и он единственный держит контраст одинаковым:
 *
 *   заливка              тёмная / светлая (к карточке)
 *   dark-700 (был line)      1.50 / 1.37
 *   dark-800/30 (был card)   1.02 / 1.04   <- невидим в обеих темах
 *   dark-500/40 (line)       1.67 / 1.61
 *   dark-500/25 (card)       1.36 / 1.35 + рамка /40
 *
 * У card заливка слабее намеренно: он покрывает большую площадь, а мелкая
 * строка требует большего контраста, чтобы читаться так же уверенно.
 */
const VARIANT_FILL: Record<SkeletonVariant, string> = {
  line: 'bg-dark-500/40',
  card: 'border border-dark-500/40 bg-dark-500/25',
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
