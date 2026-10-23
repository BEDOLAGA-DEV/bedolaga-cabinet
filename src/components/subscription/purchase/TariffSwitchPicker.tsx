import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@/components/icons';
import type { Subscription, Tariff } from '@/types';
import { tariffTrafficLabel } from '@/utils/tariffTrafficLabel';

interface Props {
  tariffs: Tariff[];
  subscription: Subscription;
  onSelect: (id: number) => void;
}

/** Switching has its own quote; catalog purchase prices are not switch prices. */
export function TariffSwitchPicker({ tariffs, subscription, onSelect }: Props) {
  const { t } = useTranslation();
  const alternatives = tariffs.filter((tariff) => tariff.id !== subscription.tariff_id);

  return (
    <section aria-labelledby="switch-options-title">
      <h2 id="switch-options-title" className="text-lg font-semibold text-dark-100">
        {t('subscription.switchTariff.chooseTitle')}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-dark-400">
        {t('subscription.switchTariff.chooseHint')}
      </p>
      <div className="mt-5 divide-y divide-dark-700/50 border-y border-dark-700/50">
        {alternatives.map((tariff) => (
          <button
            key={tariff.id}
            type="button"
            disabled={tariff.is_purchased}
            onClick={() => onSelect(tariff.id)}
            className="group flex w-full items-center gap-4 px-2 py-5 text-start transition-colors hover:bg-dark-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dark-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            <span className="min-w-0 flex-1">
              <span className="block break-words text-base font-semibold text-dark-100">
                {tariff.name}
              </span>
              {tariff.description && (
                <span className="mt-1 block text-sm leading-relaxed text-dark-400">
                  {tariff.description}
                </span>
              )}
              <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-300">
                <span>{tariffTrafficLabel(tariff.traffic_limit_gb, t)}</span>
                <span>
                  {tariff.device_limit === 0
                    ? t('lite.tariff.unlimitedDevices')
                    : t('subscription.devices', { count: tariff.device_limit })}
                </span>
                {tariff.is_daily && <span>{t('subscription.switchTariff.dailyPayment')}</span>}
              </span>
            </span>
            {tariff.is_purchased ? (
              <span className="text-sm text-dark-400">
                {t('subscription.switchTariff.alreadyOwned')}
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-2 text-sm text-dark-200">
                <span className="hidden sm:inline">{t('subscription.switchTariff.choose')}</span>
                <ChevronRightIcon aria-hidden className="h-5 w-5 rtl:rotate-180" />
              </span>
            )}
          </button>
        ))}
      </div>
      {alternatives.length === 0 && (
        <p className="py-6 text-sm text-dark-400">
          {t('subscription.switchTariff.noAlternatives')}
        </p>
      )}
    </section>
  );
}
