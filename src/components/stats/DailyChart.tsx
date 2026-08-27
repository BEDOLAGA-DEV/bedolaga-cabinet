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

import type { DailyStatItem } from './types';
import { PARTNER_STATS } from '../../constants/partner';
import { useCurrency } from '../../hooks/useCurrency';
import { useChartColors } from '../../hooks/useChartColors';

interface DailyChartProps {
  data: DailyStatItem[];
  chartId: string | number;
  title?: string;
  earningsLabel?: string;
  countLabel?: string;
}

interface ChartDataItem extends DailyStatItem {
  earnings_display: number;
  label: string;
}

export function DailyChart({ data, chartId, title, earningsLabel, countLabel }: DailyChartProps) {
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const colors = useChartColors();

  const resolvedTitle = title ?? t('referral.partner.stats.dailyChart');
  const resolvedEarningsLabel = earningsLabel ?? t('referral.partner.stats.earnings');
  const resolvedCountLabel = countLabel ?? t('referral.partner.stats.referrals');

  const chartData: ChartDataItem[] = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        earnings_display: item.earnings_kopeks / PARTNER_STATS.KOPEKS_DIVISOR,
        label: new Date(item.date + 'T00:00:00').toLocaleDateString(i18n.language, {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [data, i18n.language],
  );

  return (
    <div className="bento-card">
      <h4 className="mb-3 text-sm font-semibold text-dark-200">{resolvedTitle}</h4>
      <ResponsiveContainer width="100%" height={PARTNER_STATS.CHART.HEIGHT}>
        <AreaChart data={chartData} margin={PARTNER_STATS.CHART.MARGIN}>
          <defs>
            <linearGradient id={`earningsGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset={PARTNER_STATS.GRADIENT.START_OFFSET}
                stopColor={colors.earnings}
                stopOpacity={PARTNER_STATS.GRADIENT.START_OPACITY}
              />
              <stop
                offset={PARTNER_STATS.GRADIENT.END_OFFSET}
                stopColor={colors.earnings}
                stopOpacity={PARTNER_STATS.GRADIENT.END_OPACITY}
              />
            </linearGradient>
            <linearGradient id={`referralsGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset={PARTNER_STATS.GRADIENT.START_OFFSET}
                stopColor={colors.referrals}
                stopOpacity={PARTNER_STATS.GRADIENT.START_OPACITY}
              />
              <stop
                offset={PARTNER_STATS.GRADIENT.END_OFFSET}
                stopColor={colors.referrals}
                stopOpacity={PARTNER_STATS.GRADIENT.END_OPACITY}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray={PARTNER_STATS.GRID_DASH} stroke={colors.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.tick, fontSize: PARTNER_STATS.AXIS.TICK_FONT_SIZE }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="earnings"
            orientation="right"
            tick={{ fill: colors.earnings, fontSize: PARTNER_STATS.AXIS.TICK_FONT_SIZE }}
            tickLine={false}
            axisLine={false}
            width={PARTNER_STATS.AXIS.EARNINGS_WIDTH}
          />
          <YAxis
            yAxisId="referrals"
            orientation="left"
            tick={{ fill: colors.referrals, fontSize: PARTNER_STATS.AXIS.TICK_FONT_SIZE }}
            tickLine={false}
            axisLine={false}
            width={PARTNER_STATS.AXIS.REFERRALS_WIDTH}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: PARTNER_STATS.TOOLTIP.BORDER_RADIUS,
              fontSize: PARTNER_STATS.TOOLTIP.FONT_SIZE,
              color: colors.label,
            }}
            labelStyle={{ color: colors.label }}
            itemStyle={{ color: colors.label }}
            formatter={(value, name) => {
              const displayValue = Number(value) || 0;
              if (name === 'earnings_display') {
                return [formatWithCurrency(displayValue), resolvedEarningsLabel];
              }
              return [displayValue, resolvedCountLabel];
            }}
          />
          <Area
            yAxisId="earnings"
            type="monotone"
            dataKey="earnings_display"
            stroke={colors.earnings}
            fill={`url(#earningsGradient-${chartId})`}
            strokeWidth={PARTNER_STATS.STROKE_WIDTH}
          />
          <Area
            yAxisId="referrals"
            type="monotone"
            dataKey="referrals_count"
            stroke={colors.referrals}
            fill={`url(#referralsGradient-${chartId})`}
            strokeWidth={PARTNER_STATS.STROKE_WIDTH}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
