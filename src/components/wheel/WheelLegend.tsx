import { memo } from 'react';
import type { WheelPrize } from '../../api/wheel';

interface WheelLegendProps {
  prizes: WheelPrize[];
}

const WheelLegend = memo(function WheelLegend({ prizes }: WheelLegendProps) {
  // Get sector color (same logic as in FortuneWheel)
  const getSectorColor = (index: number, baseColor?: string) => {
    if (baseColor) return baseColor;
    const colors = [
      '#8B5CF6',
      '#EC4899',
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#6366F1',
      '#14B8A6',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-2">
      {prizes.map((prize, index) => {
        const color = getSectorColor(index, prize.color);
        return (
          <div
            key={prize.id}
            className="flex items-center gap-3 rounded-lg border border-dark-700/30 bg-dark-800/50 p-2.5 transition-colors hover:bg-dark-800"
          >
            {/* Color indicator */}
            <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />

            {/* Emoji */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">
              {prize.emoji}
            </div>

            {/* Prize name */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-dark-100">{prize.display_name}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default WheelLegend;
