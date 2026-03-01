import { useEffect, useRef } from 'react';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

interface Star {
  x: number;
  y: number;
  angle: number;
  scale: number;
  speed: number;
  distance: number;
  opacity: number;
}

interface BgStar {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number | null;
}

interface ShootingState {
  ctx: CanvasRenderingContext2D;
  shootingStars: Star[];
  bgStars: BgStar[];
  lastShootingTime: number;
  nextShootingDelay: number;
  w: number;
  h: number;
  dpr: number;
}

export default function ShootingStarsBackground({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ShootingState | null>(null);

  const starColor = sanitizeColor(settings.starColor, '#9E00FF');
  const trailColor = sanitizeColor(settings.trailColor, '#2EB9DF');
  const starDensity = clampNumber(settings.starDensity, 0.00001, 0.001, 0.00015);
  const minSpeed = clampNumber(settings.minSpeed, 1, 50, 10);
  const maxSpeed = clampNumber(settings.maxSpeed, 5, 100, 30);

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

    const count = Math.floor(w * h * starDensity);
    const bgStars: BgStar[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 1.2 + 0.3,
      opacity: Math.random(),
      twinkleSpeed: Math.random() > 0.3 ? 0.5 + Math.random() * 0.5 : null,
    }));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stateRef.current = {
      ctx,
      shootingStars: [],
      bgStars,
      lastShootingTime: 0,
      nextShootingDelay: 4200 + Math.random() * 4500,
      w,
      h,
      dpr,
    };

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
  }, [starDensity]);

  useAnimationLoop(
    (time) => {
      const state = stateRef.current;
      if (!state) return;

      const { ctx, bgStars, w, h } = state;

      ctx.clearRect(0, 0, w, h);

      for (const s of bgStars) {
        let opacity = s.opacity;
        if (s.twinkleSpeed) {
          opacity = 0.5 + 0.5 * Math.sin((time / 1000) * s.twinkleSpeed * Math.PI * 2);
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fill();
      }

      if (time - state.lastShootingTime > state.nextShootingDelay) {
        state.shootingStars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.5,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
          scale: 0.5 + Math.random() * 0.5,
          speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
          distance: 0,
          opacity: 1,
        });
        state.lastShootingTime = time;
        state.nextShootingDelay = 4200 + Math.random() * 4500;
      }

      state.shootingStars = state.shootingStars.filter((star) => {
        star.distance += star.speed;
        star.opacity = Math.max(0, 1 - star.distance / 500);

        if (star.opacity <= 0) return false;

        const x2 = star.x + Math.cos(star.angle) * star.distance;
        const y2 = star.y + Math.sin(star.angle) * star.distance;
        const tailX = star.x + Math.cos(star.angle) * Math.max(0, star.distance - 80);
        const tailY = star.y + Math.sin(star.angle) * Math.max(0, star.distance - 80);

        // Draw trail with flat color (avoids per-frame gradient allocation)
        ctx.lineWidth = star.scale * 2;
        ctx.globalAlpha = star.opacity * 0.4;
        ctx.strokeStyle = trailColor;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw head dot
        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(x2, y2, star.scale * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        return true;
      });
    },
    [starColor, trailColor, starDensity, minSpeed, maxSpeed],
  );

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
