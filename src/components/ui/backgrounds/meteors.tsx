import { useMemo } from 'react';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationPause } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

export default function Meteors({ settings }: Props) {
  const count = clampNumber(settings.count, 1, 50, 20);
  const meteorColor = sanitizeColor(settings.meteorColor, '#ffffff');
  const paused = useAnimationPause();

  const meteors = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${2 + Math.random() * 6}s`,
        size: `${1 + Math.random()}px`,
      })),
    [count],
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {meteors.map((meteor) => (
        <span
          key={meteor.id}
          className="absolute top-0 rotate-[215deg] animate-meteor-effect rounded-[9999px]"
          style={{
            left: meteor.left,
            animationDelay: meteor.delay,
            animationDuration: meteor.duration,
            animationPlayState: paused ? 'paused' : 'running',
            width: meteor.size,
            height: meteor.size,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 0 2px 1px ${meteorColor}20, 0 0 20px 2px ${meteorColor}40`,
            background: meteorColor,
          }}
        >
          <div
            className="pointer-events-none absolute top-1/2 -z-10 h-px w-[50px] -translate-y-1/2"
            style={{
              background: `linear-gradient(to right, ${meteorColor}, transparent)`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
