import { useTranslation } from 'react-i18next';

import type { PremiumTrafficInfo } from '@/types';
import { formatTraffic } from '@/utils/formatTraffic';

interface LitePremiumRowsProps {
  items: PremiumTrafficInfo[];
}

/**
 * Расход по серверам с отдельным лимитом — строками простого вида.
 *
 * Карточка с шкалой (`PremiumTrafficRow`) здесь была бы чужой: простой вид
 * держит ровно один акцент на экране, и это общая шкала трафика. Премиум
 * встаёт в общий список строк, как «Устройства» и «Баланс», — название слева,
 * остаток справа.
 *
 * Строка ничего не открывает, поэтому она и не кнопка: стрелка у `LiteRow`
 * обещает переход, которого нет. Докупка живёт отдельной строкой в управлении
 * подпиской — там, где остальные докупки.
 */
export function LitePremiumRows({ items }: LitePremiumRowsProps) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
        <div
          key={item.squad_uuid}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-dark-100"
        >
          <span className="min-w-0 flex-1 truncate text-[15px]">
            {item.name || t('dashboard.premiumTraffic')}
          </span>
          <span
            className={`shrink-0 truncate text-[15px] tabular-nums ${
              // Исчерпанный лимит — это отключённые серверы, а не просто цифра:
              // в списке без цвета его иначе не отличить от обычной строки.
              item.is_limited ? 'text-error-400' : 'text-dark-400'
            }`}
          >
            {/* Короткая подпись, а не фраза из карточки полного вида: длинное
                «доступ приостановлен до конца периода» занимало всю строку и
                выдавливало название сервера за край экрана. */}
            {item.is_limited
              ? t('lite.rows.premiumPaused', 'Лимит исчерпан')
              : `${formatTraffic(item.used_gb)} / ${formatTraffic(item.limit_gb + item.extra_gb)}`}
          </span>
        </div>
      ))}
    </>
  );
}

export default LitePremiumRows;
