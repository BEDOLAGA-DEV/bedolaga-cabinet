import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SALES_STATS } from '../../constants/salesStats';

function dateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface PeriodSelectorProps {
  value: { days?: number; startDate?: string; endDate?: string };
  onChange: (period: { days?: number; startDate?: string; endDate?: string }) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const { t } = useTranslation();
  const [showCustom, setShowCustom] = useState(false);

  const presetLabels: Record<number, string> = {
    7: t('admin.salesStats.period.week'),
    30: t('admin.salesStats.period.month'),
    90: t('admin.salesStats.period.quarter'),
    0: t('admin.salesStats.period.all'),
  };

  const handlePreset = (days: number) => {
    setShowCustom(false);
    onChange({ days });
  };

  const handleSingleDay = (offset: number) => {
    setShowCustom(false);
    const ds = dateString(offset);
    onChange({ days: undefined, startDate: ds, endDate: ds });
  };

  const handleCustomToggle = () => {
    setShowCustom((prev) => !prev);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', dateStr: string) => {
    onChange({
      ...value,
      days: undefined,
      [field]: dateStr,
    });
  };

  const isSingleDay = (offset: number) =>
    !showCustom && !value.days && value.startDate === dateString(offset) && value.startDate === value.endDate;
  const isPresetActive = (days: number) => !showCustom && value.days === days;

  const btnClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-accent-500/20 text-accent-400'
        : 'bg-dark-800/50 text-dark-400 hover:bg-dark-700/50 hover:text-dark-300'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => handleSingleDay(0)} className={btnClass(isSingleDay(0))}>
        {t('admin.salesStats.period.today', 'Сегодня')}
      </button>

      <button type="button" onClick={() => handleSingleDay(-1)} className={btnClass(isSingleDay(-1))}>
        {t('admin.salesStats.period.yesterday', 'Вчера')}
      </button>

      {SALES_STATS.PERIOD_PRESETS.map((days) => (
        <button
          key={days}
          type="button"
          onClick={() => handlePreset(days)}
          className={btnClass(isPresetActive(days))}
        >
          {presetLabels[days]}
        </button>
      ))}

      <button type="button" onClick={handleCustomToggle} className={btnClass(showCustom)}>
        {t('admin.salesStats.period.custom')}
      </button>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.startDate || ''}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="rounded-lg border border-dark-600 bg-dark-800 px-2 py-1 text-sm text-dark-200"
          />
          <span className="text-dark-500">{'\u2014'}</span>
          <input
            type="date"
            value={value.endDate || ''}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="rounded-lg border border-dark-600 bg-dark-800 px-2 py-1 text-sm text-dark-200"
          />
        </div>
      )}
    </div>
  );
}
