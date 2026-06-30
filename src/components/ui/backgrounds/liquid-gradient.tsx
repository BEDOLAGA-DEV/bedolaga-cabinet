import { cn } from '@/lib/utils';
import { sanitizeColor, clampNumber, safeSelect } from './types';
import { useAnimationPause } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const BLOBS = [
  { anim: 'animate-move-vertical', baseDuration: 30, top: '5%', left: '10%' },
  { anim: 'animate-move-in-circle', baseDuration: 20, top: '35%', left: '50%' },
  { anim: 'animate-move-horizontal', baseDuration: 40, top: '55%', left: '15%' },
  { anim: 'animate-move-in-circle-slow', baseDuration: 40, top: '15%', left: '55%' },
];

const SPEED_MULTIPLIERS: Record<string, number> = {
  slow: 1.6,
  normal: 1,
  fast: 0.5,
};

export default function LiquidGradientBackground({ settings }: Props) {
  const paused = useAnimationPause();

  const colors = [
    sanitizeColor(settings.color1, '#6366f1'),
    sanitizeColor(settings.color2, '#ec4899'),
    sanitizeColor(settings.color3, '#22d3ee'),
    sanitizeColor(settings.color4, '#a855f7'),
  ];
  const speed = safeSelect(settings.speed, ['slow', 'normal', 'fast'] as const, 'normal');
  const blurAmount = clampNumber(settings.blurAmount, 10, 120, 60);

  const multiplier = SPEED_MULTIPLIERS[speed];
  const effectiveBlur = isMobile ? Math.min(blurAmount, 30) : blurAmount;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ filter: `blur(${effectiveBlur}px)` }}>
        {BLOBS.map((blob, i) => (
          <div
            key={i}
            className={cn('absolute h-[55%] w-[55%] rounded-full', blob.anim)}
            style={{
              top: blob.top,
              left: blob.left,
              opacity: 0.7,
              background: `radial-gradient(circle at center, ${colors[i]} 0%, transparent 65%)`,
              animationDuration: `${blob.baseDuration * multiplier}s`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        ))}
      </div>
    </div>
  );
}
