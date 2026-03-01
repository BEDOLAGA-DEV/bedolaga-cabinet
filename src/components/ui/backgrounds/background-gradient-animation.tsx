import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeColor, safeBoolean, safeSelect } from './types';
import { useAnimationPause } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

function hexToRgbString(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '129, 140, 248';
  return `${r}, ${g}, ${b}`;
}

export default function BackgroundGradientAnimation({ settings }: Props) {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const paused = useAnimationPause();

  const firstColor = hexToRgbString(sanitizeColor(settings.firstColor, '#1271FF'));
  const secondColor = hexToRgbString(sanitizeColor(settings.secondColor, '#DD4AFF'));
  const thirdColor = hexToRgbString(sanitizeColor(settings.thirdColor, '#64DCFF'));
  const fourthColor = hexToRgbString(sanitizeColor(settings.fourthColor, '#C83232'));
  const fifthColor = hexToRgbString(sanitizeColor(settings.fifthColor, '#B4B432'));
  const interactive = safeBoolean(settings.interactive, true);
  const size = safeSelect(settings.size, ['60%', '80%', '100%'] as const, '80%');

  useEffect(() => {
    // Interactive mouse tracking — DESKTOP ONLY
    if (!interactive || !interactiveRef.current || isMobile) return;

    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;
    let animId = 0;
    let docHidden = document.hidden;
    let tgInactive = false;

    const isHidden = () => docHidden || tgInactive;

    const move = () => {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      if (interactiveRef.current) {
        interactiveRef.current.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      }
      animId = requestAnimationFrame(move);
    };

    const start = () => {
      if (animId) return;
      animId = requestAnimationFrame(move);
    };

    const stop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    };

    const handleMouse = (e: MouseEvent) => {
      tgX = e.clientX;
      tgY = e.clientY;
    };

    const onVisibility = () => {
      docHidden = document.hidden;
      if (isHidden()) stop();
      else start();
    };

    const tg = window.Telegram?.WebApp;
    const onActivated = () => {
      tgInactive = false;
      if (!isHidden()) start();
    };
    const onDeactivated = () => {
      tgInactive = true;
      stop();
    };

    window.addEventListener('mousemove', handleMouse);
    document.addEventListener('visibilitychange', onVisibility);
    if (tg) {
      tg.onEvent?.('activated', onActivated);
      tg.onEvent?.('deactivated', onDeactivated);
    }
    if (!isHidden()) start();

    return () => {
      stop();
      window.removeEventListener('mousemove', handleMouse);
      document.removeEventListener('visibilitychange', onVisibility);
      if (tg) {
        tg.offEvent?.('activated', onActivated);
        tg.offEvent?.('deactivated', onDeactivated);
      }
    };
  }, [interactive]);

  // Mobile: use simpler blur (just CSS blur, no SVG filter)
  // Desktop: keep the goo SVG filter + CSS blur for full effect
  const filterStyle = isMobile ? 'blur(20px)' : 'url(#blurMe) blur(40px)';

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={
        {
          '--first-color': firstColor,
          '--second-color': secondColor,
          '--third-color': thirdColor,
          '--fourth-color': fourthColor,
          '--fifth-color': fifthColor,
          '--size': size,
          background: `linear-gradient(40deg, rgb(${firstColor}), rgb(${fifthColor}))`,
        } as React.CSSProperties
      }
    >
      {/* SVG filter only rendered on desktop */}
      {!isMobile && (
        <svg className="hidden">
          <defs>
            <filter id="blurMe">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
                result="goo"
              />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>
      )}
      <div className="absolute inset-0" style={{ filter: filterStyle }}>
        {[
          { color: firstColor, anim: 'animate-move-vertical' },
          { color: secondColor, anim: 'animate-move-in-circle' },
          { color: thirdColor, anim: 'animate-move-in-circle-slow' },
          { color: fourthColor, anim: 'animate-move-horizontal' },
          { color: fifthColor, anim: 'animate-move-in-circle-fast' },
        ].map((blob, i) => (
          <div
            key={i}
            className={cn(
              'absolute left-[calc(50%-var(--size)/2)] top-[calc(50%-var(--size)/2)] h-[var(--size)] w-[var(--size)] rounded-full',
              isMobile ? 'opacity-50' : 'opacity-100 mix-blend-hard-light',
              blob.anim,
            )}
            style={{
              background: `radial-gradient(circle at center, rgba(${blob.color}, 0.8) 0, rgba(${blob.color}, 0) 50%) no-repeat`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        ))}
        {interactive && !isMobile && (
          <div
            ref={interactiveRef}
            className="absolute left-[calc(50%-var(--size)/2)] top-[calc(50%-var(--size)/2)] h-[var(--size)] w-[var(--size)] rounded-full opacity-70 mix-blend-hard-light"
            style={{
              background: `radial-gradient(circle at center, rgba(140, 100, 255, 0.8) 0, rgba(140, 100, 255, 0) 50%) no-repeat`,
            }}
          />
        )}
      </div>
    </div>
  );
}
