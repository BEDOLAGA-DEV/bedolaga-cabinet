import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserNodeUsageResponse } from '@/api/adminUsers';
import { ChartIcon } from '@/components/icons';
import { Segmented } from '@/components/admin/Segmented';
import { formatGb } from '@/utils/formatNumber';
import { getFlagEmoji } from '../../../utils/subscriptionHelpers';
import { Section } from './sectionParts';

/** Периоды расхода: сутки, неделя, месяц. Сервер отдаёт 30 дней по дням — режем на клиенте. */
const PERIODS = [1, 7, 30] as const;
const DEFAULT_PERIOD = 7;
const BYTES_IN_GB = 1024 ** 3;

/** Расход по нодам за период: полосы относительно самой нагруженной ноды. */
export function NodeUsageCard({ usage }: { usage: UserNodeUsageResponse | null }) {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(DEFAULT_PERIOD);

  const items = (usage?.items ?? [])
    .map((item) => ({
      ...item,
      total_bytes: (item.daily_bytes ?? []).slice(-days).reduce((sum, value) => sum + value, 0),
    }))
    .filter((item) => item.total_bytes > 0)
    .sort((a, b) => b.total_bytes - a.total_bytes);
  const max = items[0]?.total_bytes ?? 0;
  // «52 ГБ», «340 МБ»: меньше гигабайта — в мегабайтах, иначе «0,3 ГБ» читается хуже.
  const bytesLabel = (bytes: number) =>
    bytes >= BYTES_IN_GB
      ? `${formatGb(bytes / BYTES_IN_GB)} ${t('common.units.gb')}`
      : `${formatGb(Math.round(bytes / 1024 ** 2))} ${t('common.units.mb')}`;

  return (
    <Section
      icon={<ChartIcon className="h-5 w-5" />}
      title={t('admin.users.detail.nodeUsage')}
      action={
        <Segmented
          label={t('admin.users.detail.nodeUsage')}
          value={String(days)}
          options={PERIODS.map((period) => ({
            value: String(period),
            label: t('admin.users.detail.subscription.periodDays', { count: period }),
          }))}
          onChange={(value) => setDays(Number(value))}
        />
      }
    >
      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.node_uuid} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-dark-200">
                  {item.country_code && (
                    <span className="mr-1.5">{getFlagEmoji(item.country_code)}</span>
                  )}
                  {item.node_name}
                </span>
                <span className="shrink-0 tabular-nums text-dark-300">
                  {bytesLabel(item.total_bytes)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-dark-700/60">
                <div
                  className="h-full rounded-full bg-accent-500"
                  style={{ width: `${max > 0 ? (item.total_bytes / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-dark-500">{t('admin.users.detail.subscription.noNodeUsage')}</p>
      )}
    </Section>
  );
}
