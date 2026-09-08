import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useTrafficZone } from '../../hooks/useTrafficZone';
import type { PremiumTrafficInfo } from '../../types';
import { formatTraffic } from '../../utils/formatTraffic';
import { getGlassColors } from '../../utils/glassTheme';
import TrafficProgressBar from './TrafficProgressBar';

interface PremiumTrafficRowProps {
  items: PremiumTrafficInfo[];
}

/**
 * Расход по премиум-сквадам — серверам с отдельным лимитом трафика внутри
 * тарифа («Мобильный резерв» и подобные).
 *
 * Показывается под общим расходом и только тем, у кого такие серверы есть в
 * тарифе: бэкенд отдаёт пустой массив, когда посквадных лимитов нет.
 *
 * Лимит здесь свой, независимый от общего: исчерпав его, пользователь теряет
 * доступ только к этим серверам, остальные продолжают работать. Поэтому строка
 * отдельная, а не часть общей шкалы.
 */
export default function PremiumTrafficRow({ items }: PremiumTrafficRowProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  if (!items.length) return null;

  return (
    <div className="mb-6 space-y-3">
      {items.map((item) => (
        <PremiumTrafficItem key={item.squad_uuid} item={item} glass={g} label={t} />
      ))}
    </div>
  );
}

function PremiumTrafficItem({
  item,
  glass,
  label,
}: {
  item: PremiumTrafficInfo;
  glass: ReturnType<typeof getGlassColors>;
  label: ReturnType<typeof useTranslation>['t'];
}) {
  // Исчерпанный лимит красим как критический независимо от процента: доступ уже
  // приостановлен, и зелёная шкала на 100% вводила бы в заблуждение.
  const zone = useTrafficZone(item.is_limited ? 100 : item.used_percent);
  const totalGb = item.limit_gb + item.extra_gb;

  return (
    <div
      className="rounded-2xl px-3.5 py-3"
      style={{ background: glass.cardBg, border: `1px solid ${glass.cardBorder}` }}
    >
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: zone.mainVar }}
              aria-hidden="true"
            />
            <span className="truncate text-[13px] font-semibold text-dark-50">
              {item.name || label('dashboard.premiumTraffic')}
            </span>
          </div>
          {item.is_limited && (
            <div className="mt-0.5 text-[11px] text-dark-400">
              {label('dashboard.premiumTrafficPaused')}
            </div>
          )}
          {!item.is_limited && item.extra_gb > 0 && (
            // Докупленное показываем отдельно: иначе выросший лимит выглядит
            // как ошибка, а не как результат покупки.
            <div className="mt-0.5 text-[11px] text-dark-400">
              {label('dashboard.premiumTrafficTopped', {
                amount: formatTraffic(item.extra_gb),
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right font-mono text-[11px] text-dark-500">
          {formatTraffic(item.used_gb)} / {formatTraffic(totalGb)}
        </div>
      </div>

      <TrafficProgressBar
        usedGb={item.used_gb}
        limitGb={totalGb}
        percent={item.is_limited ? 100 : item.used_percent}
        isUnlimited={false}
        compact
      />
    </div>
  );
}
