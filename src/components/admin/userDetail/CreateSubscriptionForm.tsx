import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserAvailableTariff } from '@/api/adminUsers';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { PlusIcon } from '@/components/icons';
import { Section } from './sectionParts';

interface CreateSubscriptionFormProps {
  tariffs: UserAvailableTariff[];
  /** Тарифы, по которым уже есть живая подписка — их второй раз не создают. */
  excludeTariffIds: ReadonlySet<number>;
  busy: boolean;
  /** Подписок нет вовсе — сказать об этом. */
  noSubscriptions?: boolean;
  onCreate: (tariffId: number | null, days: number) => Promise<boolean>;
}

const DEFAULT_DAYS = 30;
const MAX_DAYS = 3650;

/** «Создать подписку»: только когда подписки нет или в списке мультитарифа. */
export function CreateSubscriptionForm({
  tariffs,
  excludeTariffIds,
  busy,
  noSubscriptions,
  onCreate,
}: CreateSubscriptionFormProps) {
  const { t } = useTranslation();
  const tariffId = useId();
  const daysId = useId();
  const [tariff, setTariff] = useState('');
  const [days, setDays] = useState(String(DEFAULT_DAYS));
  const parsedDays = Number(days);
  const valid = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= MAX_DAYS;
  const ns = 'admin.users.detail.subscription';

  return (
    <Section
      id="subscription-create"
      icon={<PlusIcon className="h-5 w-5" />}
      title={noSubscriptions ? t(`${ns}.noActive`) : t(`${ns}.createNew`)}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-dark-500" htmlFor={tariffId}>
          {t(`${ns}.tariff`)}
          <DropdownSelect
            id={tariffId}
            value={tariff}
            onChange={setTariff}
            disabled={busy}
            options={[
              { value: '', label: t(`${ns}.selectTariff`) },
              ...tariffs
                .filter((item) => !excludeTariffIds.has(item.id))
                .map((item) => ({ value: String(item.id), label: item.name })),
            ]}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-dark-500" htmlFor={daysId}>
          {t(`${ns}.days`)}
          <input
            id={daysId}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DAYS}
            value={days}
            disabled={busy}
            onChange={(event) => setDays(event.target.value)}
            className="input py-2.5"
          />
        </label>
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => void onCreate(tariff ? Number(tariff) : null, parsedDays)}
          className="btn-primary"
        >
          {t(`${ns}.create`)}
        </button>
      </div>
    </Section>
  );
}
