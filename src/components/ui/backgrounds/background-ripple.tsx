import { useEffect, useRef } from 'react';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

interface RippleState {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dpr: number;
  ripples: { phase: number }[];
}

export default function BackgroundRipple({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RippleState | null>(null);

  const rippleColor = sanitizeColor(settings.rippleColor, '#818cf8');
  const rippleCount = clampNumber(settings.rippleCount, 1, 20, 5);
  const speed = clampNumber(settings.speed, 0.1, 5, 0.5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = getMobileDpr();
    const parent = canvas.parentElement;
    const w = parent?.offsetWidth ?? window.innerWidth;
    const h = parent?.offsetHeight ?? window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ripples = Array.from({ length: rippleCount }, (_, i) => ({
      phase: (i / rippleCount) * Math.PI * 2,
    }));

    stateRef.current = { ctx, w, h, dpr, ripples };

    const onResize = () => {
      const nw = parent?.offsetWidth ?? window.innerWidth;
      const nh = parent?.offsetHeight ?? window.innerHeight;
      canvas.width = nw * dpr;
      canvas.height = nh * dpr;
      canvas.style.width = `${nw}px`;
      canvas.style.height = `${nh}px`;
      if (stateRef.current) {
        stateRef.current.w = nw;
        stateRef.current.h = nh;
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [rippleCount]);

  useAnimationLoop(
    (time) => {
      const state = stateRef.current;
      if (!state) return;

      const { ctx, w, h, dpr, ripples } = state;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);

      for (let i = 0; i < ripples.length; i++) {
        const t = ((time * speed) / 1000 + ripples[i].phase) % (Math.PI * 2);
        const progress = t / (Math.PI * 2);
        const radius = progress * maxR;
        const opacity = 0.3 * (1 - progress);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = rippleColor;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    },
    [rippleColor, rippleCount, speed],
  );

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
