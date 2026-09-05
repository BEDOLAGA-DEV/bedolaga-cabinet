import { cn } from '@/lib/utils';

/** Общий вид строки-переключателя для целей: хосты панели, конфиги подписки. */
export const ROW = 'flex items-center gap-3 rounded-xl border px-3 py-1 transition-colors';
export const ROW_ON = 'border-accent-500/40 bg-accent-500/10';
export const ROW_OFF = 'border-dark-700/60 bg-dark-900/30 hover:border-dark-600';
export const ROW_BUTTON = 'flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left';

export function CheckGlyph({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold',
        on ? 'border-accent-500 bg-accent-500 text-on-accent' : 'border-dark-600 text-transparent',
      )}
    >
      ✓
    </span>
  );
}
