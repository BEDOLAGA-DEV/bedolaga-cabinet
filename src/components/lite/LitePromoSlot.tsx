import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import PromoOffersSection from '@/components/PromoOffersSection';
import { ChevronRightIcon } from '@/components/icons';
import { promoApi } from '@/api/promo';

/**
 * Единственное место на простом экране, где магазин говорит о себе.
 *
 * Предложения приносят оператору деньги, поэтому убрать их совсем нельзя — но
 * стопка градиентных карточек и есть тот шум, из-за которого экран переделали.
 * Компромисс: по умолчанию одна строка, содержимое раскрывается по нажатию.
 * Внутри работает существующий PromoOffersSection со всей своей логикой
 * активации — переписывать её ради вида было бы риском на ровном месте.
 *
 * Запросы те же самые (`promo-offers`, `active-discount`), так что раскрытие
 * секции не стоит ни одного лишнего похода в сеть: ответ уже в кэше.
 */
export function LitePromoSlot() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: offers = [] } = useQuery({
    queryKey: ['promo-offers'],
    queryFn: promoApi.getOffers,
    staleTime: 60_000,
    retry: false,
  });

  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 60_000,
    retry: false,
  });

  const availableCount = offers.filter((offer) => offer.is_active && !offer.is_claimed).length;
  const hasDiscount = Boolean(activeDiscount?.is_active && activeDiscount.discount_percent > 0);

  // Нечего показать — строки тоже нет. Пустая строка «предложений нет» была бы
  // ровно тем лишним элементом, от которого уходим.
  if (availableCount === 0 && !hasDiscount) return null;

  if (isOpen) return <PromoOffersSection />;

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      aria-expanded={false}
      className="flex w-full items-center justify-between gap-4 py-4 text-left text-dark-100 transition-colors hover:text-dark-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
    >
      <span className="min-w-0 flex-1 truncate text-[15px]">
        {hasDiscount
          ? t('lite.promo.discountActive', 'Скидка активна')
          : t('lite.promo.available', 'Для вас есть предложение')}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {!hasDiscount && availableCount > 1 && (
          <span className="text-[15px] tabular-nums text-dark-400">{availableCount}</span>
        )}
        <ChevronRightIcon className="h-4 w-4 text-dark-500" />
      </span>
    </button>
  );
}

export default LitePromoSlot;
