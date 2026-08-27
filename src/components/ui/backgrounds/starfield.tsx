import { useEffect, useRef } from 'react';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const MAX_DEPTH = 1000;

interface Star {
  x: number;
  y: number;
  z: number;
}

interface StarfieldState {
  ctx: CanvasRenderingContext2D;
  stars: Star[];
  w: number;
  h: number;
  dpr: number;
}

function spawnStar(w: number, h: number, randomDepth: boolean): Star {
  return {
    x: (Math.random() - 0.5) * w * 2,
    y: (Math.random() - 0.5) * h * 2,
    z: randomDepth ? Math.random() * MAX_DEPTH : MAX_DEPTH,
  };
}

export default function StarfieldBackground({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<StarfieldState | null>(null);

  const color = sanitizeColor(settings.color, '#ffffff');
  const starCount = clampNumber(settings.starCount, 50, 800, 200);
  const speed = clampNumber(settings.speed, 0.1, 5, 1);

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

    const stars = Array.from({ length: Math.floor(starCount) }, () => spawnStar(w, h, true));

    stateRef.current = { ctx, stars, w, h, dpr };

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
  }, [starCount]);

  useAnimationLoop(() => {
    const state = stateRef.current;
    if (!state) return;

    const { ctx, stars, w, h } = state;
    const cx = w / 2;
    const cy = h / 2;
    const fov = Math.min(w, h);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= speed * 4;

      if (s.z <= 1) {
        stars[i] = spawnStar(w, h, false);
        continue;
      }

      const k = fov / s.z;
      const sx = cx + s.x * k;
      const sy = cy + s.y * k;

      if (sx < 0 || sx > w || sy < 0 || sy > h) {
        stars[i] = spawnStar(w, h, false);
        continue;
      }

      const depth = 1 - s.z / MAX_DEPTH;
      const radius = Math.max(0.3, depth * 2.2);

      ctx.globalAlpha = 0.2 + depth * 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [color, starCount, speed]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
