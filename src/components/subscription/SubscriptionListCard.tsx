import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { getGlassColors } from '../../utils/glassTheme';
import { useHaptic } from '../../platform';
import type { SubscriptionListItem } from '../../types';

function formatDate(iso: string | null, locale?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale ?? undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function StatusBadge({
  status,
  isTrial,
  t,
}: {
  status: string;
  isTrial: boolean;
  t: (key: string, fallback: string) => string;
}) {
  const isActive = status === 'active' || status === 'trial';
  const isLimited = status === 'limited';
  const isExpired = status === 'expired' || status === 'disabled';

  if (isTrial) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        {t('subscription.statusTrial', 'Тестовая')}
      </span>
    );
  }

  const color = isActive
    ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20'
    : isLimited
      ? 'bg-amber-400/15 text-amber-400 border-amber-400/20'
      : 'bg-red-400/15 text-red-400 border-red-400/20';

  const label = isActive
    ? t('subscription.statusActive', 'Активна')
    : isLimited
      ? t('subscription.statusLimited', 'Ограничена')
      : isExpired
        ? t('subscription.statusExpired', 'Истекла')
        : status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}
    >
      {label}
    </span>
  );
}

export default function SubscriptionListCard({
  subscription,
  onClick,
}: {
  subscription: SubscriptionListItem;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const { impact } = useHaptic();

  const handleClick = () => {
    impact('light');
    onClick();
  };

  const isTrial = subscription.is_trial;
  const isActive = subscription.status === 'active' || subscription.status === 'trial';
  const isExpired = subscription.status === 'expired' || subscription.status === 'disabled';
  const trafficLimit = subscription.traffic_limit_gb;
  const trafficUsed = subscription.traffic_used_gb;
  const isUnlimited = trafficLimit === 0;
  const trafficPercent = isUnlimited
    ? 0
    : trafficLimit > 0
      ? Math.min(100, (trafficUsed / trafficLimit) * 100)
      : 0;
  const trafficColor =
    trafficPercent >= 90 ? 'bg-red-400' : trafficPercent >= 70 ? 'bg-amber-400' : 'bg-emerald-400';

  const borderColor = isTrial
    ? 'rgba(251,191,36,0.2)'
    : isExpired
      ? 'rgba(255,59,92,0.15)'
      : g.cardBorder;

  const bgColor = isTrial
    ? isDark
      ? 'rgba(251,191,36,0.04)'
      : 'rgba(251,191,36,0.03)'
    : isExpired
      ? isDark
        ? 'rgba(255,59,92,0.04)'
        : 'rgba(255,59,92,0.03)'
      : g.cardBg;

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: bgColor, borderColor }}
    >
      {/* Header: tariff name + status badge + chevron */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-semibold" style={{ color: g.text }}>
            {subscription.tariff_name || t('subscription.defaultName', 'Подписка')}
          </span>
          <StatusBadge status={subscription.status} isTrial={isTrial} t={t} />
        </div>
        <svg
          className="h-4 w-4 shrink-0 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Traffic mini progress bar */}
      {isActive && (
        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[11px] font-medium" style={{ color: g.textSecondary }}>
              {t('subscription.traffic', 'Трафик')}
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: g.textSecondary }}>
              {isUnlimited
                ? '∞'
                : `${trafficUsed.toFixed(1)} / ${trafficLimit} ${t('common.units.gb', 'ГБ')}`}
            </span>
          </div>
          {!isUnlimited && (
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: g.innerBg }}>
              <div
                className={`h-full rounded-full transition-all ${trafficColor}`}
                style={{ width: `${Math.max(1, trafficPercent)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div
        className="mt-2.5 flex items-center gap-4 text-[12px]"
        style={{ color: g.textSecondary }}
      >
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5 opacity-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path d="M12 18h.01" />
          </svg>
          {subscription.device_limit}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5 opacity-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {formatDate(subscription.end_date, i18n.language)}
        </span>
        {!isTrial &&
          (() => {
            const isDaily = subscription.is_daily;
            const enabled = isDaily ? !subscription.is_daily_paused : subscription.autopay_enabled;
            const label = isDaily
              ? t('subscription.dailyAutoCharge', 'Автосписание')
              : t('subscription.autopay', 'Автопродление');
            return (
              <span
                className={`flex items-center gap-1 ${enabled ? 'text-emerald-400/70' : 'text-red-400/50'}`}
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  {enabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                {label}
              </span>
            );
          })()}
      </div>
    </button>
  );
}
