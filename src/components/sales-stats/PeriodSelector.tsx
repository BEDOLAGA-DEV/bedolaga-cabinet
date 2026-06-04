import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SALES_STATS } from '../../constants/salesStats';
import { getMonthToDateRange, isMonthToDate } from '../../utils/period';
import { DateField } from '../DateField';

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

  const handleThisMonth = () => {
    setShowCustom(false);
    onChange({ days: undefined, ...getMonthToDateRange() });
  };

  const handleCustomToggle = () => setShowCustom((prev) => !prev);

  const handleDateChange = (field: 'startDate' | 'endDate', dateStr: string) => {
    onChange({ ...value, days: undefined, [field]: dateStr });
  };

  const buttonClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-accent-500/20 text-accent-400'
        : 'bg-dark-800/50 text-dark-400 hover:bg-dark-700/50 hover:text-dark-300'
    }`;

  const mtdActive = !showCustom && isMonthToDate(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleThisMonth} className={buttonClass(mtdActive)}>
        {t('admin.salesStats.period.thisMonth')}
      </button>

      {SALES_STATS.PERIOD_PRESETS.map((days) => (
        <button
          key={days}
          type="button"
          onClick={() => handlePreset(days)}
          className={buttonClass(!showCustom && value.days === days)}
        >
          {presetLabels[days]}
        </button>
      ))}

      <button type="button" onClick={handleCustomToggle} className={buttonClass(showCustom)}>
        {t('admin.salesStats.period.custom')}
      </button>

      {showCustom && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <DateField
            value={value.startDate || ''}
            onChange={(v) => handleDateChange('startDate', v)}
            max={value.endDate}
            placeholder={t('admin.salesStats.period.from')}
          />
          <span className="text-dark-500">{'—'}</span>
          <DateField
            value={value.endDate || ''}
            onChange={(v) => handleDateChange('endDate', v)}
            min={value.startDate}
            placeholder={t('admin.salesStats.period.to')}
          />
        </div>
      )}
    </div>
  );
}
