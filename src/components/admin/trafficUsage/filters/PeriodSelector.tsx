import { useTranslation } from 'react-i18next';
import { CalendarIcon, XIcon } from '../TrafficIcons';

// ──────────────────────────────────────────────────────────────────
// PeriodSelector — switches between fixed period tabs (1/3/7/14/30
// days) and a free custom-date-range mode. Parent owns all state;
// component is fully controlled.
//
// PERIODS is re-exported so the parent's prefetch effect iterates
// the same canonical list.
// ──────────────────────────────────────────────────────────────────

export const PERIODS = [1, 3, 7, 14, 30] as const;

export function PeriodSelector({
  value,
  onChange,
  label,
  dateMode,
  customStart,
  customEnd,
  onToggleDateMode,
  onCustomStartChange,
  onCustomEndChange,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  dateMode: boolean;
  customStart: string;
  customEnd: string;
  onToggleDateMode: () => void;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}) {
  const { t } = useTranslation();

  // Limit: last 31 days
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (dateMode) {
    return (
      <div className="flex items-center gap-2">
        <CalendarIcon />
        <span className="text-xs text-dark-400">{t('admin.trafficUsage.dateFrom')}</span>
        <input
          type="date"
          value={customStart}
          min={minDate}
          max={customEnd || today}
          onChange={(e) => onCustomStartChange(e.target.value)}
          className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1 text-xs text-dark-200 focus:border-dark-600 focus:outline-none"
        />
        <span className="text-xs text-dark-400">{t('admin.trafficUsage.dateTo')}</span>
        <input
          type="date"
          value={customEnd}
          min={customStart || minDate}
          max={today}
          onChange={(e) => onCustomEndChange(e.target.value)}
          className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1 text-xs text-dark-200 focus:border-dark-600 focus:outline-none"
        />
        <button
          onClick={onToggleDateMode}
          className="rounded-lg p-1 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
          title={t('admin.trafficUsage.period')}
        >
          <XIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-dark-400">{label}</span>
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              value === p
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-dark-400 hover:bg-dark-700 hover:text-dark-200'
            }`}
          >
            {p}
            {t('admin.trafficUsage.days')}
          </button>
        ))}
      </div>
      <button
        onClick={onToggleDateMode}
        className="rounded-lg border border-dark-700 bg-dark-800 p-1.5 text-dark-400 transition-colors hover:border-dark-600 hover:bg-dark-700 hover:text-dark-200"
        title={t('admin.trafficUsage.customDates')}
      >
        <CalendarIcon />
      </button>
    </div>
  );
}
