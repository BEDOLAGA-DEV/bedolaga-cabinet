import { useEffect, useRef } from 'react';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface ConstellationState {
  ctx: CanvasRenderingContext2D;
  particles: Particle[];
  w: number;
  h: number;
  dpr: number;
}

export default function ConstellationBackground({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ConstellationState | null>(null);

  const particleColor = sanitizeColor(settings.particleColor, '#818cf8');
  const lineColor = sanitizeColor(settings.lineColor, '#818cf8');
  const count = clampNumber(settings.count, 10, 200, 60);
  const linkDistance = clampNumber(settings.linkDistance, 40, 300, 120);

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

    const particles: Particle[] = Array.from({ length: Math.floor(count) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    stateRef.current = { ctx, particles, w, h, dpr };

    const onResize = () => {
      const nw = parent?.offsetWidth ?? window.innerWidth;
      const nh = parent?.offsetHeight ?? window.innerHeight;
      canvas.width = nw * dpr;
      canvas.height = nh * dpr;
      canvas.style.width = `${nw}px`;
      canvas.style.height = `${nh}px`;
      const state = stateRef.current;
      if (state) {
        state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (state.w > 0 && state.h > 0) {
          for (const p of state.particles) {
            p.x *= nw / state.w;
            p.y *= nh / state.h;
          }
        }
        state.w = nw;
        state.h = nh;
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [count]);

  useAnimationLoop(() => {
    const state = stateRef.current;
    if (!state) return;

    const { ctx, particles, w, h } = state;
    const linkDistanceSq = linkDistance * linkDistance;

    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) {
        p.x = 0;
        p.vx = Math.abs(p.vx);
      } else if (p.x > w) {
        p.x = w;
        p.vx = -Math.abs(p.vx);
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy = Math.abs(p.vy);
      } else if (p.y > h) {
        p.y = h;
        p.vy = -Math.abs(p.vy);
      }
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.8;

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distSq = dx * dx + dy * dy;

        if (distSq < linkDistanceSq) {
          const dist = Math.sqrt(distSq);
          ctx.globalAlpha = (1 - dist / linkDistance) * 0.35;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = particleColor;

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [particleColor, lineColor, count, linkDistance]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
