import React, { useEffect, useRef, useMemo } from 'react';
import { sanitizeColor, clampNumber } from './types';
import { useAnimationLoop, getMobileDpr } from '@/hooks/useAnimationLoop';

interface Props {
  settings: Record<string, unknown>;
}

const COLORS = [
  '#93c5fd',
  '#f9a8d4',
  '#86efac',
  '#fde047',
  '#fca5a5',
  '#d8b4fe',
  '#a5b4fc',
  '#c4b5fd',
];

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

interface CellData {
  rgb: [number, number, number];
  phase: number;
  period: number;
}

const SKEW_X_TAN = Math.tan((-48 * Math.PI) / 180);
const SKEW_Y_TAN = Math.tan((14 * Math.PI) / 180);
const GRID_SCALE = 0.675;

interface BoxesState {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export default React.memo(function BackgroundBoxes({ settings }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BoxesState | null>(null);
  const rows = clampNumber(settings.rows, 4, 30, 15);
  const cols = clampNumber(settings.cols, 4, 30, 15);
  const boxColor = sanitizeColor(settings.boxColor, '#818cf8');

  const cells = useMemo((): CellData[] => {
    return Array.from({ length: rows * cols }, () => ({
      rgb: hexToRgb(
        boxColor === '#818cf8' ? COLORS[Math.floor(Math.random() * COLORS.length)] : boxColor,
      ),
      phase: Math.random() * 8,
      period: 3 + Math.random() * 4,
    }));
  }, [rows, cols, boxColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = getMobileDpr();
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stateRef.current = { ctx, w: canvas.width, h: canvas.height };

    const onResize = () => {
      const r = parent.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      if (stateRef.current) {
        stateRef.current.w = canvas.width;
        stateRef.current.h = canvas.height;
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useAnimationLoop(
    (now) => {
      const state = stateRef.current;
      if (!state) return;

      const { ctx, w, h } = state;
      const t = now * 0.001;

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      ctx.transform(1, 0, SKEW_X_TAN, 1, 0, 0);
      ctx.transform(1, SKEW_Y_TAN, 0, 1, 0, 0);
      ctx.scale(GRID_SCALE, GRID_SCALE);
      ctx.translate(-cx, -cy);

      const gw = w * 3;
      const gh = h * 3;
      const ox = -w;
      const oy = -h;
      const cellW = gw / cols;
      const cellH = gh / rows;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const cycleT = ((t + cell.phase) % cell.period) / cell.period;
        const alpha = 0.15 * Math.sin(cycleT * Math.PI);
        if (alpha < 0.005) continue;

        const col = i % cols;
        const row = (i - col) / cols;
        const [r, g, b] = cell.rgb;

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(ox + col * cellW, oy + row * cellH, cellW, cellH);
      }

      ctx.strokeStyle = 'rgba(51,65,85,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let r = 0; r <= rows; r++) {
        const y = oy + r * cellH;
        ctx.moveTo(ox, y);
        ctx.lineTo(ox + gw, y);
      }
      for (let c = 0; c <= cols; c++) {
        const x = ox + c * cellW;
        ctx.moveTo(x, oy);
        ctx.lineTo(x, oy + gh);
      }

      ctx.stroke();
      ctx.restore();
    },
    [cells, rows, cols],
  );

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
});
