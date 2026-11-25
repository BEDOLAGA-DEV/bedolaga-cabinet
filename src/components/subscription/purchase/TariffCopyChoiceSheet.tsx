import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { formatLiteDate } from '@/utils/liteDate';
import type { SubscriptionListItem, Tariff } from '@/types';

/** Подписки, которые можно продлить: живые и не пробные. */
const LIVE_STATUSES = ['active', 'limited'];

export function liveCopiesOf(
  tariffId: number,
  subscriptions: SubscriptionListItem[] | undefined,
): SubscriptionListItem[] {
  return (subscriptions ?? []).filter(
    (subscription) =>
      subscription.tariff_id === tariffId &&
      !subscription.is_trial &&
      LIVE_STATUSES.includes(subscription.status),
  );
}

interface TariffCopyChoiceSheetProps {
  /** Тариф, который у человека уже есть; `null` — окно закрыто. */
  tariff: Tariff | null;
  subscriptions: SubscriptionListItem[] | undefined;
  onBuyAnother: (tariff: Tariff) => void;
  onClose: () => void;
}

/**
 * Мультитариф: тариф уже есть — продлить имеющуюся подписку (какую) или
 * купить ещё одну. У каждой подписки свои устройства, трафик и ссылка.
 */
export function TariffCopyChoiceSheet({
  tariff,
  subscriptions,
  onBuyAnother,
  onClose,
}: TariffCopyChoiceSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const copies = tariff ? liveCopiesOf(tariff.id, subscriptions) : [];

  return (
    <ResponsiveSheet
      isOpen={tariff !== null}
      onClose={onClose}
      title={tariff ? t('subscription.copies.title', { name: tariff.name }) : ''}
    >
      <p className="mb-4 text-sm text-dark-400">{t('subscription.copies.description')}</p>
      <div className="space-y-2">
        {copies.map((copy) => (
          <button
            key={copy.id}
            type="button"
            className="btn-secondary w-full py-3 text-sm"
            onClick={() => navigate(`/subscriptions/${copy.id}/renew`)}
          >
            {copy.end_date
              ? t('subscription.copies.renewUntil', { date: formatLiteDate(copy.end_date) })
              : t('subscription.copies.renew')}
          </button>
        ))}
        <button
          type="button"
          className="btn-primary w-full py-3 text-sm"
          onClick={() => tariff && onBuyAnother(tariff)}
        >
          {t('subscription.copies.buyAnother')}
        </button>
      </div>
    </ResponsiveSheet>
  );
}
