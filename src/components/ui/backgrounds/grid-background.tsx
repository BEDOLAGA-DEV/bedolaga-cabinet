import { sanitizeColor, clampNumber, safeSelect } from './types';

interface Props {
  settings: Record<string, unknown>;
}

export default function GridBackground({ settings }: Props) {
  const variant = safeSelect(settings.variant, ['grid', 'dots'] as const, 'grid');
  const gridColor = sanitizeColor(settings.gridColor, 'rgba(255,255,255,0.05)');
  const gridSize = clampNumber(settings.gridSize, 10, 200, 40);
  const dotSize = clampNumber(settings.dotSize, 0.5, 10, 1.5);

  if (variant === 'dots') {
    return (
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${gridColor} ${dotSize}px, transparent ${dotSize}px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
    );
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(to right, ${gridColor} 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
      }}
    />
  );
}
