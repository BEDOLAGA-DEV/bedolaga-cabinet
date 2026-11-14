import { useTranslation } from 'react-i18next';

import type { PremiumTrafficInfo } from '@/types';
import { formatTraffic } from '@/utils/formatTraffic';
import { liteMeterColor, liteMeterWidth } from '@/utils/liteMeter';

interface LitePremiumMetersProps {
  items: PremiumTrafficInfo[];
}

/**
 * Расход по серверам с отдельным лимитом — под общей шкалой трафика.
 *
 * Место выбрано тем же соображением, что и в полном виде: свой расход человек
 * читает одним движением сверху вниз, а не собирает из двух мест экрана. Лимит
 * здесь независимый — исчерпав его, человек теряет только эти серверы, — поэтому
 * шкала отдельная, а не часть общей.
 *
 * Шкалы тоньше общей и подписаны мелким: простой вид держит один главный акцент,
 * и эти полосы читаются как уточнение к нему, а не как второй такой же виджет.
 * Пороги цвета общие с `LiteMeter` — «пора докупать» в двух местах не должно
 * означать разное.
 */
export function LitePremiumMeters({ items }: LitePremiumMetersProps) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => {
        const total = item.limit_gb + item.extra_gb;
        // Снятый за перерасход сервер — это уже отключённый доступ: шкала
        // полная и тревожного цвета, сколько бы ни намерил воркер.
        const percent = item.is_limited ? 100 : item.used_percent;
        const name = item.name || t('dashboard.premiumTraffic');

        return (
          <div key={item.squad_uuid}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-[13px] text-dark-300">{name}</span>
              <span
                className={`shrink-0 truncate text-[13px] tabular-nums ${
                  item.is_limited ? 'text-error-400' : 'text-dark-400'
                }`}
              >
                {item.is_limited
                  ? t('lite.rows.premiumPaused', 'Лимит исчерпан')
                  : t('lite.traffic.used', '{{used}} из {{total}}', {
                      used: formatTraffic(item.used_gb),
                      total: formatTraffic(total),
                    })}
              </span>
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-dark-700/40"
              role="progressbar"
              aria-valuenow={Math.round(liteMeterWidth(percent))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={name}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${liteMeterWidth(percent)}%`,
                  background: item.is_limited
                    ? 'rgb(var(--color-error-500))'
                    : liteMeterColor(percent),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LitePremiumMeters;
