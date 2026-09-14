import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserAvailableTariff } from '@/api/adminUsers';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { Card } from '@/components/data-display';

interface CreateSubscriptionFormProps {
  tariffs: UserAvailableTariff[];
  /** Тарифы, по которым уже есть живая подписка — их второй раз не создают. */
  excludeTariffIds: ReadonlySet<number>;
  disabled: boolean;
  /** Показать подсказку, что подписки нет вовсе. */
  noActive?: boolean;
  onCreate: (tariffId: number | null, days: number) => Promise<void>;
}

const DEFAULT_DAYS = 30;

/** Форма «Создать подписку»: показывается только когда подписки нет или в мультитарифе. */
export function CreateSubscriptionForm({
  tariffs,
  excludeTariffIds,
  disabled,
  noActive,
  onCreate,
}: CreateSubscriptionFormProps) {
  const { t } = useTranslation();
  const tariffId = useId();
  const daysId = useId();
  const [tariff, setTariff] = useState('');
  const [days, setDays] = useState(String(DEFAULT_DAYS));
  const parsedDays = Number(days);
  const valid = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 3650;

  return (
    <Card size="md" id="subscription-create" className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="text-lg font-semibold text-dark-100">
        {t('admin.users.detail.subscription.createNew')}
      </h2>
      {noActive && (
        <p className="text-sm text-dark-400">{t('admin.users.detail.subscription.noActive')}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-dark-500" htmlFor={tariffId}>
          {t('admin.users.detail.subscription.tariff')}
          <DropdownSelect
            id={tariffId}
            value={tariff}
            onChange={setTariff}
            disabled={disabled}
            options={[
              { value: '', label: t('admin.users.detail.subscription.selectTariff') },
              ...tariffs
                .filter((item) => !excludeTariffIds.has(item.id))
                .map((item) => ({ value: String(item.id), label: item.name })),
            ]}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-dark-500" htmlFor={daysId}>
          {t('admin.users.detail.subscription.days')}
          <input
            id={daysId}
            type="number"
            min={1}
            max={3650}
            value={days}
            disabled={disabled}
            onChange={(event) => setDays(event.target.value)}
            className="input py-2.5"
          />
        </label>
        <button
          type="button"
          disabled={disabled || !valid}
          onClick={() => onCreate(tariff ? Number(tariff) : null, parsedDays)}
          className="btn-primary"
        >
          {disabled
            ? t('admin.users.detail.subscription.creating')
            : t('admin.users.detail.subscription.create')}
        </button>
      </div>
    </Card>
  );
}
