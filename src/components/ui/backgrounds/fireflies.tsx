import { useEffect, useRef } from 'react';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  pulseSpeed: number;
}

interface FirefliesState {
  ctx: CanvasRenderingContext2D;
  fireflies: Firefly[];
  w: number;
  h: number;
  dpr: number;
}

export default function FirefliesBackground({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<FirefliesState | null>(null);

  const color = sanitizeColor(settings.color, '#ffd166');
  const count = clampNumber(settings.count, 5, 200, 40);
  const speed = clampNumber(settings.speed, 0.1, 3, 1);
  const size = clampNumber(settings.size, 0.5, 6, 2);

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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fireflies: Firefly[] = Array.from({ length: Math.floor(count) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.5 + Math.random() * 1.5,
    }));

    stateRef.current = { ctx, fireflies, w, h, dpr };

    const onResize = () => {
      const nw = parent?.offsetWidth ?? window.innerWidth;
      const nh = parent?.offsetHeight ?? window.innerHeight;
      canvas.width = nw * dpr;
      canvas.height = nh * dpr;
      canvas.style.width = `${nw}px`;
      canvas.style.height = `${nh}px`;
      if (stateRef.current) {
        stateRef.current.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stateRef.current.w = nw;
        stateRef.current.h = nh;
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [count]);

  useAnimationLoop(
    (time) => {
      const state = stateRef.current;
      if (!state) return;

      const { ctx, fireflies, w, h } = state;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;

      for (const f of fireflies) {
        f.x += f.vx * speed + Math.sin(time / 2000 + f.phase) * 0.3 * speed;
        f.y += f.vy * speed + Math.cos(time / 2400 + f.phase) * 0.2 * speed;

        if (f.x < -20) f.x = w + 20;
        if (f.x > w + 20) f.x = -20;
        if (f.y < -20) f.y = h + 20;
        if (f.y > h + 20) f.y = -20;

        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((time / 1000) * f.pulseSpeed + f.phase));
        const radius = f.radius * size;

        ctx.globalAlpha = pulse * 0.25;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    },
    [color, count, speed, size],
  );

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
