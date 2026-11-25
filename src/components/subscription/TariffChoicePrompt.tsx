import { useTranslation } from 'react-i18next';
import { formatLiteDate } from '@/utils/liteDate';
import type { TariffChoiceAnswer, TariffChoiceSubscription } from '@/utils/tariffChoice';

interface TariffChoicePromptProps {
  subscriptions: TariffChoiceSubscription[];
  busy?: boolean;
  onAnswer: (answer: TariffChoiceAnswer) => void;
}

/**
 * Тариф уже есть: добавить дни к имеющейся подписке (к какой) или активировать
 * отдельной подпиской со своими устройствами, трафиком и ссылкой.
 */
export function TariffChoicePrompt({ subscriptions, busy, onAnswer }: TariffChoicePromptProps) {
  const { t } = useTranslation();
  return (
    <div className="w-full max-w-sm space-y-3 text-center" role="group">
      <p className="text-sm text-dark-300">{t('subscription.copies.activationQuestion')}</p>
      {subscriptions.map((subscription) => (
        <button
          key={subscription.id}
          type="button"
          disabled={busy}
          className="btn-secondary w-full py-3 text-sm disabled:opacity-50"
          onClick={() => onAnswer({ target_subscription_id: subscription.id })}
        >
          {t('subscription.copies.addToUntil', { date: formatLiteDate(subscription.end_date) })}
        </button>
      ))}
      <button
        type="button"
        disabled={busy}
        className="btn-primary w-full py-3 text-sm disabled:opacity-50"
        onClick={() => onAnswer({ as_copy: true })}
      >
        {t('subscription.copies.separate')}
      </button>
    </div>
  );
}
