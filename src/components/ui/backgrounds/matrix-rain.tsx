import { useEffect, useRef } from 'react';
import { sanitizeColor, clampNumber, safeSelect } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const FONT_SIZE = 16;
const BASE_STEP_MS = 80;

const CHARSETS: Record<string, string> = {
  katakana:
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボ',
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  binary: '01',
};

interface MatrixState {
  ctx: CanvasRenderingContext2D;
  drops: number[];
  active: boolean[];
  acc: number;
  w: number;
  h: number;
  dpr: number;
}

export default function MatrixRainBackground({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MatrixState | null>(null);

  const color = sanitizeColor(settings.color, '#00ff41');
  const density = clampNumber(settings.density, 10, 100, 70);
  const speed = clampNumber(settings.speed, 0.2, 3, 1);
  const charset = safeSelect(
    settings.charset,
    ['katakana', 'latin', 'binary'] as const,
    'katakana',
  );

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

    const initColumns = (width: number, height: number) => {
      const cols = Math.max(1, Math.floor(width / FONT_SIZE));
      return {
        drops: Array.from({ length: cols }, () => Math.floor(Math.random() * (height / FONT_SIZE))),
        active: Array.from({ length: cols }, () => Math.random() * 100 < density),
      };
    };

    const { drops, active } = initColumns(w, h);
    stateRef.current = { ctx, drops, active, acc: 0, w, h, dpr };

    const onResize = () => {
      const nw = parent?.offsetWidth ?? window.innerWidth;
      const nh = parent?.offsetHeight ?? window.innerHeight;
      canvas.width = nw * dpr;
      canvas.height = nh * dpr;
      canvas.style.width = `${nw}px`;
      canvas.style.height = `${nh}px`;
      if (stateRef.current) {
        stateRef.current.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const next = initColumns(nw, nh);
        stateRef.current.drops = next.drops;
        stateRef.current.active = next.active;
        stateRef.current.w = nw;
        stateRef.current.h = nh;
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [density]);

  useAnimationLoop(
    (_time, delta) => {
      const state = stateRef.current;
      if (!state) return;

      const { ctx, drops, active, w, h } = state;
      const chars = CHARSETS[charset];

      state.acc += delta;
      const stepMs = BASE_STEP_MS / speed;
      if (state.acc < stepMs) return;
      state.acc %= stepMs;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      ctx.fillStyle = color;
      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (!active[i]) continue;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);

        if (drops[i] * FONT_SIZE > h && Math.random() > 0.975) {
          drops[i] = 0;
          active[i] = Math.random() * 100 < density;
        }
        drops[i]++;
      }
    },
    [color, density, speed, charset],
  );

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
