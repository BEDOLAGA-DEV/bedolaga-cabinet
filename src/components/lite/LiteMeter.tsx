import { useTranslation } from 'react-i18next';

import { formatTraffic } from '@/utils/formatTraffic';
import { liteMeterColor, liteMeterWidth } from '@/utils/liteMeter';

interface LiteMeterProps {
  usedGb: number;
  limitGb: number;
  usedPercent: number;
}

/**
 * Остаток трафика одной полосой.
 *
 * Полоса намеренно тонкая и без подложки-карточки: на простом экране она стоит
 * прямо под фразой о подписке и читается как её продолжение, а не как отдельный
 * виджет. Цифры — табличными знаками, иначе значение прыгает по ширине при
 * каждом обновлении и полоса «дышит».
 */
export function LiteMeter({ usedGb, limitGb, usedPercent }: LiteMeterProps) {
  const { t } = useTranslation();

  if (!limitGb || limitGb <= 0) {
    return (
      <p className="text-sm text-dark-400">
        {t('lite.traffic.unlimited', 'Трафик без ограничений')}
      </p>
    );
  }

  const width = liteMeterWidth(usedPercent);
  const color = liteMeterColor(usedPercent);

  return (
    <div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-dark-700/40"
        role="progressbar"
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('lite.traffic.label', 'Трафик')}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <p className="mt-2 text-sm tabular-nums text-dark-400">
        {t('lite.traffic.used', '{{used}} из {{total}}', {
          used: formatTraffic(usedGb),
          total: formatTraffic(limitGb),
        })}
      </p>
    </div>
  );
}

export default LiteMeter;
