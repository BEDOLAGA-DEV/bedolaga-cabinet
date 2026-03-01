import { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

interface LinesState {
  ctx: CanvasRenderingContext2D;
  noise3D: ReturnType<typeof createNoise3D>;
  nt: number;
  w: number;
  h: number;
  dpr: number;
}

export default function BackgroundLines({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<LinesState | null>(null);

  const lineCount = clampNumber(settings.lineCount, 5, 100, 40);
  const lineColor = sanitizeColor(settings.lineColor, '#818cf8');
  const speed = clampNumber(settings.speed, 0.0005, 0.01, 0.002);
  const strokeWidth = clampNumber(settings.strokeWidth, 0.5, 5, 1);

  const effectiveLineCount = isMobile ? Math.min(lineCount, 20) : lineCount;
  const step = isMobile ? 8 : 4;

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

    stateRef.current = { ctx, noise3D: createNoise3D(), nt: 0, w, h, dpr };

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
  }, []);

  useAnimationLoop(() => {
    const state = stateRef.current;
    if (!state) return;

    const { ctx, noise3D, w, h } = state;
    state.nt += speed;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = strokeWidth;

    for (let i = 0; i < effectiveLineCount; i++) {
      const yBase = (i / effectiveLineCount) * h;
      const opacity = 0.1 + 0.15 * Math.sin((i / effectiveLineCount) * Math.PI);

      ctx.globalAlpha = opacity;
      ctx.beginPath();

      for (let x = 0; x < w; x += step) {
        const y = yBase + noise3D(x / 600, i * 0.3, state.nt) * 40;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }, [effectiveLineCount, lineColor, speed, strokeWidth]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
