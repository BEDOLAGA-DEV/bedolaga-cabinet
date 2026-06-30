import { cn } from '@/lib/utils';
import { sanitizeColor, safeBoolean, safeSelect } from './types';
import { useAnimationPause } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const SPEED_DURATIONS: Record<string, string> = {
  slow: '90s',
  normal: '60s',
  fast: '30s',
};

export default function AuroraBackground({ settings }: Props) {
  const firstColor = sanitizeColor(settings.firstColor, '#3b82f6');
  const secondColor = sanitizeColor(settings.secondColor, '#a5b4fc');
  const thirdColor = sanitizeColor(settings.thirdColor, '#93c5fd');
  const speed = safeSelect(settings.speed, ['slow', 'normal', 'fast'] as const, 'normal');
  const showRadialGradient = safeBoolean(settings.showRadialGradient, true);
  const paused = useAnimationPause();

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={cn(
          'pointer-events-none absolute -inset-[10px] opacity-50',
          !isMobile && 'animate-aurora',
          showRadialGradient &&
            '[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]',
        )}
        style={{
          backgroundImage: `repeating-linear-gradient(100deg, #000 0%, #000 7%, transparent 10%, transparent 12%, #000 16%), repeating-linear-gradient(100deg, ${firstColor} 10%, ${secondColor} 15%, ${thirdColor} 20%, ${secondColor} 25%, ${firstColor} 30%)`,
          backgroundSize: isMobile ? '100%, 100%' : '300%, 200%',
          animationDuration: SPEED_DURATIONS[speed],
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  );
}
