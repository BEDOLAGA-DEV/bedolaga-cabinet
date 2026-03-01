import { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const TAU = 2 * Math.PI;
const lerp = (n1: number, n2: number, speed: number) => (1 - speed) * n1 + speed * n2;
const fadeInOut = (t: number, m: number) => {
  const hm = 0.5 * m;
  return Math.abs(((t + hm) % m) - hm) / hm;
};
const rand = (n: number) => n * Math.random();
const randRange = (n: number) => n - rand(2 * n);

interface VortexState {
  ctx: CanvasRenderingContext2D;
  noise3D: ReturnType<typeof createNoise3D>;
  particleProps: Float32Array;
  tick: number;
  center: [number, number];
  w: number;
  h: number;
  dpr: number;
}

export default function VortexBackground({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<VortexState | null>(null);

  const particleCount = clampNumber(settings.particleCount, 50, 2000, 500);
  const rangeY = clampNumber(settings.rangeY, 10, 500, 100);
  const baseHue = clampNumber(settings.baseHue, 0, 360, 220);
  const rangeSpeed = clampNumber(settings.rangeSpeed, 0.1, 5, 1.5);
  const backgroundColor = sanitizeColor(settings.backgroundColor, '#000000');

  const particlePropCount = 9;

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
    ctx.lineCap = 'round';

    const noise3D = createNoise3D();
    const particlePropsLength = particleCount * particlePropCount;
    const particleProps = new Float32Array(particlePropsLength);
    const center: [number, number] = [0.5 * w, 0.5 * h];

    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      particleProps[i] = rand(w);
      particleProps[i + 1] = center[1] + randRange(rangeY);
      particleProps[i + 2] = 0;
      particleProps[i + 3] = 0;
      particleProps[i + 4] = 0;
      particleProps[i + 5] = 50 + rand(150);
      particleProps[i + 6] = rand(rangeSpeed);
      particleProps[i + 7] = 1 + rand(2);
      particleProps[i + 8] = baseHue + rand(100);
    }

    stateRef.current = { ctx, noise3D, particleProps, tick: 0, center, w, h, dpr };

    const onResize = () => {
      const nw = parent?.offsetWidth ?? window.innerWidth;
      const nh = parent?.offsetHeight ?? window.innerHeight;
      canvas.width = nw * dpr;
      canvas.height = nh * dpr;
      canvas.style.width = `${nw}px`;
      canvas.style.height = `${nh}px`;
      if (stateRef.current) {
        stateRef.current.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stateRef.current.ctx.lineCap = 'round';
        stateRef.current.center = [0.5 * nw, 0.5 * nh];
        stateRef.current.w = nw;
        stateRef.current.h = nh;
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [particleCount, rangeY, baseHue, rangeSpeed]);

  useAnimationLoop(() => {
    const state = stateRef.current;
    if (!state) return;

    const { ctx, noise3D, particleProps, w, h } = state;
    const particlePropsLength = particleCount * particlePropCount;

    state.tick++;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      const x = particleProps[i];
      const y = particleProps[i + 1];
      const n = noise3D(x * 0.00125, y * 0.00125, state.tick * 0.0005) * 3 * TAU;
      const vx = lerp(particleProps[i + 2], Math.cos(n), 0.5);
      const vy = lerp(particleProps[i + 3], Math.sin(n), 0.5);
      const life = particleProps[i + 4];
      const ttl = particleProps[i + 5];
      const speed = particleProps[i + 6];
      const x2 = x + vx * speed;
      const y2 = y + vy * speed;
      const radius = particleProps[i + 7];
      const hue = particleProps[i + 8];

      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      particleProps[i] = x2;
      particleProps[i + 1] = y2;
      particleProps[i + 2] = vx;
      particleProps[i + 3] = vy;
      particleProps[i + 4] = life + 1;

      if (x2 > w || x2 < 0 || y2 > h || y2 < 0 || life + 1 > ttl) {
        particleProps[i] = rand(w);
        particleProps[i + 1] = state.center[1] + randRange(rangeY);
        particleProps[i + 2] = 0;
        particleProps[i + 3] = 0;
        particleProps[i + 4] = 0;
        particleProps[i + 5] = 50 + rand(150);
        particleProps[i + 6] = rand(rangeSpeed);
        particleProps[i + 7] = 1 + rand(2);
        particleProps[i + 8] = baseHue + rand(100);
      }
    }

    // Glow effect — DESKTOP ONLY
    if (!isMobile) {
      ctx.save();
      ctx.filter = 'blur(8px) brightness(200%)';
      ctx.globalCompositeOperation = 'lighter';
      const canvas = canvasRef.current;
      if (canvas) ctx.drawImage(canvas, 0, 0, w, h);
      ctx.restore();
    }
  }, [particleCount, rangeY, baseHue, rangeSpeed, backgroundColor]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
