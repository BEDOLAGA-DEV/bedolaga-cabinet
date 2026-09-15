import { CHART_COMMON } from './charts';

export const SALES_STATS = {
  CHART: {
    ...CHART_COMMON.CHART,
    HEIGHT: 220,
    PIE_HEIGHT: 250,
  },
  KOPEKS_DIVISOR: CHART_COMMON.KOPEKS_DIVISOR,
  GRADIENT: CHART_COMMON.GRADIENT,
  AXIS: {
    TICK_FONT_SIZE: CHART_COMMON.AXIS.TICK_FONT_SIZE,
  },
  TOOLTIP: CHART_COMMON.TOOLTIP,
  STROKE_WIDTH: CHART_COMMON.STROKE_WIDTH,
  GRID_DASH: CHART_COMMON.GRID_DASH,
  STALE_TIME: CHART_COMMON.STALE_TIME,
  DEFAULT_PERIOD: 30,
  PERIOD_PRESETS: [7, 30, 90, 0] as const,
  PROVIDER_COLORS: {
    telegram: '#229ED9',
    email: '#34d399',
    vk: '#4C75A3',
    yandex: '#FC3F1D',
    google: '#4285F4',
    discord: '#5865F2',
  } as const,
  BAR_COLORS: [
    '#34d399',
    '#818cf8',
    '#f59e0b',
    '#ec4899',
    '#06b6d4',
    '#8b5cf6',
    '#f97316',
    '#14b8a6',
  ] as const,
} as const;
