import { cn } from '@/lib/utils';

/** Цвета тарифов bsbord.com палитрой кабинета: free серый, bronze янтарный, silver светлый, gold золотой, platinum акцент. */
const TIER_CLASS: Record<string, string> = {
  free: 'border-dark-600 bg-dark-800/40 text-dark-400',
  bronze: 'border-warning-500/40 bg-warning-500/10 text-warning-500',
  silver: 'border-dark-400/50 bg-dark-700/40 text-dark-200',
  gold: 'border-urgent-400/50 bg-urgent-400/10 text-urgent-400',
  platinum: 'border-accent-400/50 bg-accent-500/10 text-accent-300',
};

interface TierBadgeProps {
  tier: string;
  className?: string;
}

/** Тариф как на bsbord.com: пилюля «◆ GOLD» цветом тарифа, без даты. */
export function TierBadge({ tier, className }: TierBadgeProps) {
  const key = tier.trim().toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
        TIER_CLASS[key] ?? TIER_CLASS.free,
        className,
      )}
    >
      <span aria-hidden="true">◆</span>
      {key}
    </span>
  );
}
