import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SALES_STATS } from '../../constants/salesStats';
import { useChartColors } from '../../hooks/useChartColors';

interface SimpleAreaChartProps {
  data: { date: string; value: number }[];
  title: string;
  color?: string;
  chartId: string;
  valueLabel?: string;
  height?: number;
}

export function SimpleAreaChart({
  data,
  title,
  color,
  chartId,
  valueLabel,
  height = SALES_STATS.CHART.HEIGHT,
}: SimpleAreaChartProps) {
  const { t, i18n } = useTranslation();
  const colors = useChartColors();
  const strokeColor = color || colors.earnings;

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        label: new Date(item.date + 'T00:00:00').toLocaleDateString(i18n.language, {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [data, i18n.language],
  );

  if (data.length === 0) {
    return (
      <div className="bento-card">
        <h4 className="mb-3 text-sm font-semibold text-dark-200">{title}</h4>
        <div className="flex items-center justify-center text-sm text-dark-400" style={{ height }}>
          {t('common.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card">
      <h4 className="mb-3 text-sm font-semibold text-dark-200">{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={SALES_STATS.CHART.MARGIN}>
          <defs>
            <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset={SALES_STATS.GRADIENT.START_OFFSET}
                stopColor={strokeColor}
                stopOpacity={SALES_STATS.GRADIENT.START_OPACITY}
              />
              <stop
                offset={SALES_STATS.GRADIENT.END_OFFSET}
                stopColor={strokeColor}
                stopOpacity={SALES_STATS.GRADIENT.END_OPACITY}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray={SALES_STATS.GRID_DASH} stroke={colors.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.tick, fontSize: SALES_STATS.AXIS.TICK_FONT_SIZE }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: colors.tick, fontSize: SALES_STATS.AXIS.TICK_FONT_SIZE }}
            tickLine={false}
            axisLine={false}
            width={SALES_STATS.AXIS.WIDTH}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: SALES_STATS.TOOLTIP.BORDER_RADIUS,
              fontSize: SALES_STATS.TOOLTIP.FONT_SIZE,
              color: colors.label,
            }}
            labelStyle={{ color: colors.label }}
            itemStyle={{ color: colors.label }}
            formatter={(value) => [Number(value) || 0, valueLabel || '']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            fill={`url(#gradient-${chartId})`}
            strokeWidth={SALES_STATS.STROKE_WIDTH}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
