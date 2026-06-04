import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SALES_STATS } from '../../constants/salesStats';
import { useChartColors } from '../../hooks/useChartColors';

interface StackedBarChartProps {
  data: { date: string; key: string; value: number }[];
  title: string;
  valueFormatter?: (value: number) => string;
  height?: number;
}

/**
 * Composition-over-time as a STACKED bar chart. Replaces the overlapping
 * multi-series area chart for "daily by method / by tariff" — stacked bars read
 * far cleaner (no layered translucent areas hiding each other) and the tooltip
 * shows every series for the hovered day plus the day total.
 */
export function StackedBarChart({
  data,
  title,
  valueFormatter,
  height = SALES_STATS.CHART.HEIGHT,
}: StackedBarChartProps) {
  const { t, i18n } = useTranslation();
  const colors = useChartColors();

  const { chartData, seriesKeys } = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();
    const keySet = new Set<string>();

    for (const item of data) {
      keySet.add(item.key);
      const existing = dateMap.get(item.date) || {};
      existing[item.key] = (existing[item.key] || 0) + item.value;
      dateMap.set(item.date, existing);
    }

    const keys = Array.from(keySet).sort();
    const sortedDates = Array.from(dateMap.keys()).sort();
    const pivoted = sortedDates.map((date) => {
      const row: Record<string, string | number> = {
        date,
        label: new Date(date + 'T00:00:00').toLocaleDateString(i18n.language, {
          month: 'short',
          day: 'numeric',
        }),
      };
      const values = dateMap.get(date) || {};
      for (const key of keys) {
        row[key] = values[key] || 0;
      }
      return row;
    });

    return { chartData: pivoted, seriesKeys: keys };
  }, [data, i18n.language]);

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
        <BarChart data={chartData} margin={SALES_STATS.CHART.MARGIN}>
          <CartesianGrid
            strokeDasharray={SALES_STATS.GRID_DASH}
            stroke={colors.grid}
            vertical={false}
          />
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
            cursor={{ fill: colors.grid, fillOpacity: 0.2 }}
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: SALES_STATS.TOOLTIP.BORDER_RADIUS,
              fontSize: SALES_STATS.TOOLTIP.FONT_SIZE,
              color: colors.label,
            }}
            labelStyle={{ color: colors.label }}
            itemStyle={{ color: colors.label }}
            formatter={(value: number | undefined, name: string | undefined) => [
              valueFormatter ? valueFormatter(value ?? 0) : (value ?? 0),
              name || '',
            ]}
          />
          <Legend />
          {seriesKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              stackId="a"
              fill={SALES_STATS.BAR_COLORS[index % SALES_STATS.BAR_COLORS.length]}
              radius={index === seriesKeys.length - 1 ? [4, 4, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
