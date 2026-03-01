import { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import { sanitizeColor, clampNumber, safeSelect } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

interface WavyState {
  ctx: CanvasRenderingContext2D;
  noise3D: ReturnType<typeof createNoise3D>;
  nt: number;
  w: number;
  h: number;
  dpr: number;
}

export default function WavyBackground({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<WavyState | null>(null);

  const speed = safeSelect(settings.speed, ['slow', 'fast'] as const, 'fast');
  const waveWidth = clampNumber(settings.waveWidth, 5, 200, 50);
  const blur = clampNumber(settings.blur, 0, 50, 10);
  const waveOpacity = clampNumber(settings.waveOpacity, 0.05, 1, 0.5);
  const backgroundFill = sanitizeColor(settings.backgroundFill, '#000000');
  const colors = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#22d3ee'];

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
    const effectiveBlur = isMobile ? Math.min(blur, 4) : blur;
    ctx.filter = effectiveBlur > 0 ? `blur(${effectiveBlur}px)` : 'none';

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
        const eb = isMobile ? Math.min(blur, 4) : blur;
        stateRef.current.ctx.filter = eb > 0 ? `blur(${eb}px)` : 'none';
        stateRef.current.w = nw;
        stateRef.current.h = nh;
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [blur]);

  const speedVal = speed === 'slow' ? 0.001 : 0.002;
  const waveCount = isMobile ? 3 : 5;
  const step = isMobile ? 8 : 5;

  useAnimationLoop(() => {
    const state = stateRef.current;
    if (!state) return;

    const { ctx, noise3D, w, h } = state;
    state.nt += speedVal;

    ctx.globalAlpha = 1;
    ctx.fillStyle = backgroundFill;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < waveCount; i++) {
      ctx.beginPath();
      ctx.lineWidth = waveWidth;
      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = waveOpacity;

      for (let x = 0; x < w; x += step) {
        const y = noise3D(x / 800, 0.3 * i, state.nt) * 100;
        ctx.lineTo(x, y + h * 0.5);
      }

      ctx.stroke();
      ctx.closePath();
    }
  }, [speed, waveWidth, blur, waveOpacity, backgroundFill]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
