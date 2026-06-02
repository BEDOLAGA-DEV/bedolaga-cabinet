import { useEffect, useRef, useState, memo } from 'react';
import type { WheelPrize } from '../../api/wheel';

interface FortuneWheelProps {
  prizes: WheelPrize[];
  isSpinning: boolean;
  targetRotation: number | null;
  onSpinComplete: () => void;
}

const FortuneWheel = memo(function FortuneWheel({
  prizes,
  isSpinning,
  targetRotation,
  onSpinComplete,
}: FortuneWheelProps) {
  const wheelRef = useRef<SVGGElement>(null);
  const accumulatedRotation = useRef(0);
  const [displayRotation, setDisplayRotation] = useState(0);

  useEffect(() => {
    if (isSpinning && targetRotation !== null && wheelRef.current) {
      const currentPos = accumulatedRotation.current % 360;
      let delta = targetRotation - currentPos;
      // Normalize delta to positive
      while (delta < 0) delta += 360;
      const newRotation = accumulatedRotation.current + 1800 + delta;
      accumulatedRotation.current = newRotation;
      setDisplayRotation(newRotation);

      const timeout = setTimeout(() => {
        onSpinComplete();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [isSpinning, targetRotation, onSpinComplete]);

  if (prizes.length === 0) {
    return (
      <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center">
        <p className="text-dark-400">No prizes configured</p>
      </div>
    );
  }

  const size = 400;
  const center = size / 2;
  const outerRadius = size / 2 - 20;
  const innerRadius = outerRadius - 15;
  const prizeRadius = innerRadius - 5;
  const sectorAngle = 360 / prizes.length;
  const hubRadius = 45;

  const createSectorPath = (index: number) => {
    const startAngle = (index * sectorAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sectorAngle - 90) * (Math.PI / 180);

    const x1 = center + prizeRadius * Math.cos(startAngle);
    const y1 = center + prizeRadius * Math.sin(startAngle);
    const x2 = center + prizeRadius * Math.cos(endAngle);
    const y2 = center + prizeRadius * Math.sin(endAngle);

    const x1Inner = center + hubRadius * Math.cos(startAngle);
    const y1Inner = center + hubRadius * Math.sin(startAngle);
    const x2Inner = center + hubRadius * Math.cos(endAngle);
    const y2Inner = center + hubRadius * Math.sin(endAngle);

    const largeArc = sectorAngle > 180 ? 1 : 0;

    return `M ${x1Inner} ${y1Inner}
            L ${x1} ${y1}
            A ${prizeRadius} ${prizeRadius} 0 ${largeArc} 1 ${x2} ${y2}
            L ${x2Inner} ${y2Inner}
            A ${hubRadius} ${hubRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`;
  };

  // Position for emoji - closer to outer edge
  const getEmojiPosition = (index: number) => {
    const angle = (index * sectorAngle + sectorAngle / 2 - 90) * (Math.PI / 180);
    const emojiRadius = prizeRadius * 0.75;
    return {
      x: center + emojiRadius * Math.cos(angle),
      y: center + emojiRadius * Math.sin(angle),
      rotation: index * sectorAngle + sectorAngle / 2,
    };
  };

  // Alternate colors for sectors
  const getSectorColors = (index: number, baseColor?: string) => {
    if (baseColor) return baseColor;
    const colors = [
      '#8B5CF6',
      '#EC4899',
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#6366F1',
      '#14B8A6',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="relative mx-auto w-full max-w-[380px] select-none">
      {/* Outer glow effect */}
      <div
        className={`absolute inset-[-30px] rounded-full transition-all duration-500 ${
          isSpinning ? 'scale-105 opacity-100' : 'opacity-60'
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(236, 72, 153, 0.2) 40%, transparent 70%)',
          filter: 'blur(25px)',
        }}
      />

      {/* Pointer */}
      <div className="absolute left-1/2 top-[-12px] z-20 -translate-x-1/2">
        <div className="relative">
          <div
            className={`absolute inset-[-10px] blur-lg transition-opacity ${isSpinning ? 'opacity-100' : 'opacity-70'}`}
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.9) 0%, transparent 60%)',
            }}
          />
          <svg width="44" height="56" viewBox="0 0 44 56" className="relative drop-shadow-2xl">
            <defs>
              <linearGradient id="pointerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="30%" stopColor="#FBBF24" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <filter id="pointerGlow">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="3"
                  floodColor="#F59E0B"
                  floodOpacity="0.6"
                />
              </filter>
            </defs>
            <polygon
              points="22,56 2,14 22,0 42,14"
              fill="url(#pointerGold)"
              filter="url(#pointerGlow)"
            />
            <polygon points="22,50 6,16 22,4" fill="rgba(255,255,255,0.3)" />
            <circle cx="22" cy="24" r="8" fill="#FEF3C7" />
            <circle cx="22" cy="24" r="5" fill="#FBBF24" />
            <circle cx="19" cy="21" r="2" fill="white" opacity="0.8" />
          </svg>
        </div>
      </div>

      {/* Main Wheel */}
      <div className="relative aspect-square">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
          <defs>
            {/* Sector gradients */}
            {prizes.map((prize, index) => {
              const color = getSectorColors(index, prize.color);
              return (
                <linearGradient
                  key={`grad-${index}`}
                  id={`sectorGrad-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={color} stopOpacity="1" />
                  <stop offset="50%" stopColor={color} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.7" />
                </linearGradient>
              );
            })}

            {/* Outer ring gradient */}
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="25%" stopColor="#A855F7" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="75%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>

            {/* Hub gradient */}
            <radialGradient id="hubGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#4338CA" />
            </radialGradient>

            {/* Text shadow filter */}
            <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.7" />
            </filter>

            {/* LED glow as a soft gradient instead of a CSS blur. CSS filters on
                cx/cy-positioned SVG elements mis-render under the spin's GPU
                compositing — phantom streaks toward the centre that are often
                invisible in screen recordings but visible live. */}
            <radialGradient id="ledGlowGrad">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#FDE047" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
            </radialGradient>

            {/* SVG-native emoji shadow (not a CSS filter) for the same reason */}
            <filter id="emojiShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background shadow */}
          <circle cx={center} cy={center + 6} r={outerRadius + 5} fill="rgba(0,0,0,0.3)" />

          {/* Outer decorative ring */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="15"
          />

          {/* Inner ring border */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />

          {/* LED chase animation — pure CSS, no React re-renders */}
          <style>
            {`
              @keyframes ledChase {
                0%, 100% { fill: #374151; stroke: #1F2937; }
                10%, 30% { fill: #FEF08A; stroke: #FDE047; }
              }
              @keyframes ledGlow {
                0%, 100% { opacity: 0; }
                10%, 30% { opacity: 0.4; }
              }
              .led-dot { animation: ledChase 6s linear infinite; }
              .led-glow { opacity: 0; animation: ledGlow 6s linear infinite; }
              .led-spinning .led-dot { animation-duration: 2s; }
              .led-spinning .led-glow { animation-duration: 2s; }
            `}
          </style>
          <g className={isSpinning ? 'led-spinning' : undefined}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i * 18 - 90) * (Math.PI / 180);
              const ledRadius = outerRadius + 3;
              const dotX = center + ledRadius * Math.cos(angle);
              const dotY = center + ledRadius * Math.sin(angle);
              // Delay as fraction of full cycle — CSS handles speed via animation-duration
              const delay = `${(i / 20) * 6}s`;
              return (
                <g key={`led-${i}`}>
                  <circle
                    className="led-glow"
                    cx={dotX}
                    cy={dotY}
                    r={9}
                    fill="url(#ledGlowGrad)"
                    style={{ animationDelay: delay }}
                  />
                  <circle
                    className="led-dot"
                    cx={dotX}
                    cy={dotY}
                    r={3.5}
                    strokeWidth="1"
                    style={{ animationDelay: delay }}
                  />
                </g>
              );
            })}
          </g>

          {/* Rotating wheel group */}
          <g
            ref={wheelRef}
            style={{
              transformOrigin: `${center}px ${center}px`,
              transform: `rotate(${displayRotation}deg)`,
              transition: isSpinning ? 'transform 5s cubic-bezier(0.15, 0.6, 0.1, 1)' : 'none',
            }}
          >
            {/* Sectors */}
            {prizes.map((prize, index) => (
              <path
                key={`sector-${prize.id}`}
                d={createSectorPath(index)}
                fill={`url(#sectorGrad-${index})`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
              />
            ))}

            {/* Sector dividers */}
            {prizes.map((_, index) => {
              const angle = (index * sectorAngle - 90) * (Math.PI / 180);
              const x1 = center + hubRadius * Math.cos(angle);
              const y1 = center + hubRadius * Math.sin(angle);
              const x2 = center + prizeRadius * Math.cos(angle);
              const y2 = center + prizeRadius * Math.sin(angle);
              return (
                <line
                  key={`divider-${index}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="2"
                />
              );
            })}

            {/* Prize content - Emoji */}
            {prizes.map((prize, index) => {
              const pos = getEmojiPosition(index);
              return (
                <text
                  key={`emoji-${prize.id}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={prizes.length <= 6 ? '32' : '26'}
                  transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                  filter="url(#emojiShadow)"
                >
                  {prize.emoji}
                </text>
              );
            })}

            {/* Prize content - Text removed, only emoji visible on wheel */}
          </g>

          {/* Center hub */}
          <circle
            cx={center}
            cy={center}
            r={hubRadius}
            fill="url(#hubGrad)"
            stroke="#A5B4FC"
            strokeWidth="3"
          />

          {/* Hub inner decoration */}
          <circle
            cx={center}
            cy={center}
            r={hubRadius - 8}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />

          {/* Hub shine */}
          <ellipse cx={center - 10} cy={center - 12} rx={15} ry={10} fill="rgba(255,255,255,0.2)" />

          {/* Center button */}
          <circle
            cx={center}
            cy={center}
            r={hubRadius - 12}
            fill="#312E81"
            stroke="#6366F1"
            strokeWidth="2"
          />

          {/* Center text */}
          <text
            x={center}
            y={center + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#C7D2FE"
            letterSpacing="0.15em"
          >
            {isSpinning ? '...' : 'SPIN'}
          </text>
        </svg>

        {/* Spinning overlay glow */}
        {isSpinning && (
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 50%)',
              animation: 'pulse 0.5s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </div>
  );
});

export default FortuneWheel;
