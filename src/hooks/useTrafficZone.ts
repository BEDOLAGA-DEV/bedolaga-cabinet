import { useMemo } from 'react';
import { getTrafficZone, TrafficColorKey } from '../utils/trafficZone';
import { useThemeColors } from './useThemeColors';
import type { ThemeColors } from '../types/theme';

const FALLBACKS: Record<TrafficColorKey, string> = {
  accent: '#3b82f6',
  warning: 'rgb(var(--color-urgent-400))',
  error: 'rgb(var(--color-critical-500))',
};

const COLOR_MAP: Record<TrafficColorKey, keyof ThemeColors> = {
  accent: 'accent',
  warning: 'warning',
  error: 'error',
};

export function useTrafficZone(percent: number) {
  const { colors } = useThemeColors();
  const zone = useMemo(() => getTrafficZone(percent), [percent]);
  const mainHex = useMemo(() => {
    const key = zone.colorKey;
    return colors[COLOR_MAP[key]] || FALLBACKS[key];
  }, [zone.colorKey, colors]);

  return { ...zone, mainHex, colors };
}
