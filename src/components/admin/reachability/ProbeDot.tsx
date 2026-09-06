import { cn } from '@/lib/utils';
import type { CellState } from './probeCells';

const DOT: Record<CellState, string> = {
  ok: 'bg-success-400',
  down: 'bg-error-400',
  warn: 'bg-warning-400',
  na: 'bg-transparent ring-1 ring-inset ring-dark-600',
};

interface ProbeDotProps {
  state: CellState;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

/** Точка состояния как в оригинале: зелёная · красная · жёлтая · пустая (проба не запрашивалась). */
export function ProbeDot({ state, size = 'md', className, title }: ProbeDotProps) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      className={cn(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5',
        DOT[state],
        className,
      )}
    />
  );
}
