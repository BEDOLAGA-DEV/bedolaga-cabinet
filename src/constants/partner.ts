import { CHART_COMMON } from './charts';

export const PARTNER_STATS = {
  /** Chart visual configuration */
  CHART: {
    ...CHART_COMMON.CHART,
    HEIGHT: 200,
  },
  /** Kopeks-to-currency divisor */
  KOPEKS_DIVISOR: CHART_COMMON.KOPEKS_DIVISOR,
  /** Copy feedback duration in ms */
  COPY_FEEDBACK_MS: 2000,
  /** Gradient stop offsets */
  GRADIENT: CHART_COMMON.GRADIENT,
  /** Axis tick styling */
  AXIS: {
    TICK_FONT_SIZE: CHART_COMMON.AXIS.TICK_FONT_SIZE,
  },
  /** Tooltip styling */
  TOOLTIP: CHART_COMMON.TOOLTIP,
  /** Area stroke width */
  STROKE_WIDTH: CHART_COMMON.STROKE_WIDTH,
  /** Grid dash array */
  GRID_DASH: CHART_COMMON.GRID_DASH,
  /** Skeleton count for loading state */
  SKELETON_COUNT: 3,
  /** Maximum conversion rate for progress bar */
  MAX_CONVERSION_RATE: 100,
  /** Stale time for campaign stats query (ms) */
  STATS_STALE_TIME: CHART_COMMON.STALE_TIME,
} as const;
