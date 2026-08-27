/**
 * Shared button styling for connection blocks. The config-driven blocks
 * (BlockButtons) and the Happ TV quick-connect both render through this so the
 * latter adapts to exactly the same visual language as the styles coming from
 * the subscription-page config — no divergent one-off button styles.
 */
export function blockButtonClass(variant: 'light' | 'subtle', isLight?: boolean): string {
  if (variant === 'light') {
    return isLight
      ? 'rounded-xl border border-accent-500/50 px-4 py-2 text-sm font-medium text-accent-600 shadow-sm transition-all hover:bg-accent-500/10'
      : 'rounded-xl border border-accent-500/40 px-4 py-2 text-sm font-medium text-accent-400 transition-all hover:bg-accent-500/10';
  }
  return isLight
    ? 'rounded-xl px-3 py-1.5 text-sm font-medium text-dark-300 transition-all hover:bg-dark-700/30'
    : 'rounded-xl px-3 py-1.5 text-sm font-medium text-dark-300 transition-all hover:bg-dark-700/50';
}
