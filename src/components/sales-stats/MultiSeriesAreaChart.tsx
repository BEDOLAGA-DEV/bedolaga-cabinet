import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SALES_STATS } from '../../constants/salesStats';
import { useChartColors } from '../../hooks/useChartColors';

interface MultiSeriesAreaChartProps {
  data: { date: string; key: string; value: number }[];
  title: string;
  chartId: string;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
}

export function MultiSeriesAreaChart({
  data,
  title,
  chartId,
  valueLabel,
  valueFormatter,
  height = SALES_STATS.CHART.HEIGHT,
}: MultiSeriesAreaChartProps) {
  const { t, i18n } = useTranslation();
  const colors = useChartColors();

  // Pivot flat data into { label, [key1]: value, [key2]: value, ... }
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
        <AreaChart data={chartData} margin={SALES_STATS.CHART.MARGIN}>
          <defs>
            {seriesKeys.map((key, i) => {
              const color = SALES_STATS.BAR_COLORS[i % SALES_STATS.BAR_COLORS.length];
              return (
                <linearGradient
                  key={key}
                  id={`gradient-${chartId}-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset={SALES_STATS.GRADIENT.START_OFFSET}
                    stopColor={color}
                    stopOpacity={SALES_STATS.GRADIENT.START_OPACITY}
                  />
                  <stop
                    offset={SALES_STATS.GRADIENT.END_OFFSET}
                    stopColor={color}
                    stopOpacity={SALES_STATS.GRADIENT.END_OPACITY}
                  />
                </linearGradient>
              );
            })}
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
            formatter={(value, name) => [
              valueFormatter ? valueFormatter(Number(value) || 0) : Number(value) || 0,
              String(name ?? '') || valueLabel || '',
            ]}
          />
          <Legend />
          {seriesKeys.map((key, i) => {
            const color = SALES_STATS.BAR_COLORS[i % SALES_STATS.BAR_COLORS.length];
            return (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={key}
                stroke={color}
                fill={`url(#gradient-${chartId}-${i})`}
                strokeWidth={SALES_STATS.STROKE_WIDTH}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
