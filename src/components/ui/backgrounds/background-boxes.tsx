import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { sanitizeColor, clampNumber } from './types';

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

export default React.memo(function BackgroundBoxes({ settings }: Props) {
  const rows = clampNumber(settings.rows, 4, 30, 15);
  const cols = clampNumber(settings.cols, 4, 30, 15);
  const boxColor = sanitizeColor(settings.boxColor, '#818cf8');

  const cells = useMemo(() => {
    const result: { color: string; delay: number; duration: number }[] = [];
    for (let i = 0; i < rows * cols; i++) {
      result.push({
        color:
          boxColor === '#818cf8' ? COLORS[Math.floor(Math.random() * COLORS.length)] : boxColor,
        delay: Math.random() * 8,
        duration: 3 + Math.random() * 4,
      });
    }
    return result;
  }, [rows, cols, boxColor]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        style={{
          position: 'absolute',
          top: '-100%',
          left: '-100%',
          width: '300%',
          height: '300%',
          display: 'grid',
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          transform: 'skewX(-48deg) skewY(14deg) scale(0.675) translateZ(0)',
          transformOrigin: 'center center',
        }}
      >
        {cells.map((cell, i) => (
          <motion.div
            key={i}
            className="border border-slate-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{
              duration: cell.duration,
              delay: cell.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ backgroundColor: cell.color }}
          />
        ))}
      </div>
    </div>
  );
});
