import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SALES_STATS } from '../../constants/salesStats';
import { useChartColors } from '../../hooks/useChartColors';

interface SimpleBarChartProps {
  data: { name: string; value: number; color?: string }[];
  title: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

const BAR_CHART_MARGIN = {
  ...SALES_STATS.CHART.MARGIN,
  bottom: 40,
};

export function SimpleBarChart({
  data,
  title,
  height = SALES_STATS.CHART.HEIGHT,
  valueFormatter,
}: SimpleBarChartProps) {
  const { t } = useTranslation();
  const colors = useChartColors();

  const adjustedHeight = useMemo(() => height + 35, [height]);

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
      <ResponsiveContainer width="100%" height={adjustedHeight}>
        <BarChart data={data} margin={BAR_CHART_MARGIN}>
          <CartesianGrid strokeDasharray={SALES_STATS.GRID_DASH} stroke={colors.grid} />
          <XAxis
            dataKey="name"
            tick={{ fill: colors.tick, fontSize: SALES_STATS.AXIS.TICK_FONT_SIZE }}
            tickLine={false}
            angle={-30}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis
            tick={{ fill: colors.tick, fontSize: SALES_STATS.AXIS.TICK_FONT_SIZE }}
            tickLine={false}
            axisLine={false}
            width={SALES_STATS.AXIS.WIDTH}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: colors.grid, fillOpacity: 0.3 }}
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: SALES_STATS.TOOLTIP.BORDER_RADIUS,
              fontSize: SALES_STATS.TOOLTIP.FONT_SIZE,
              color: colors.label,
            }}
            labelStyle={{ color: colors.label }}
            itemStyle={{ color: colors.label }}
            formatter={(value) => [
              valueFormatter ? valueFormatter(Number(value) || 0) : Number(value) || 0,
            ]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color || SALES_STATS.BAR_COLORS[index % SALES_STATS.BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
