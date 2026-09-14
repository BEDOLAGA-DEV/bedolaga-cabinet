import { type ReactNode, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserAvailableTariff } from '@/api/adminUsers';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';

/**
 * Маленькие формы под рядом кнопок подписки. Закрываются только при успехе:
 * если сервер отказал, введённое остаётся на месте, а причину показывает тост.
 */

const MAX_DAYS = 3650;
const ns = 'admin.users.detail.subscription';

interface FormBaseProps<T> {
  busy: boolean;
  onSubmit: (value: T) => Promise<boolean>;
  onClose: () => void;
}

function InlineForm({ id, hint, children }: { id?: string; hint?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className="flex scroll-mt-24 flex-col gap-2 rounded-xl border border-dark-700 bg-dark-800/60 p-3"
    >
      <div className="flex flex-wrap items-end gap-2">{children}</div>
      {hint && <p className="text-xs text-dark-500">{hint}</p>}
    </div>
  );
}

function FormButtons({
  label,
  danger,
  disabled,
  onSubmit,
  onClose,
}: {
  label: string;
  danger?: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className={danger ? 'btn-danger' : 'btn-primary'}
      >
        {label}
      </button>
      <button type="button" onClick={onClose} className="btn-secondary">
        {t('common.cancel')}
      </button>
    </>
  );
}

export function DaysForm({
  label,
  submitLabel,
  defaultDays,
  danger,
  busy,
  onSubmit,
  onClose,
}: FormBaseProps<number> & {
  label: string;
  submitLabel: string;
  defaultDays: number;
  danger?: boolean;
}) {
  const id = useId();
  const [days, setDays] = useState(String(defaultDays));
  const parsed = Number(days);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_DAYS;
  const submit = async () => {
    if (valid && (await onSubmit(parsed))) onClose();
  };
  return (
    <InlineForm>
      <label htmlFor={id} className="flex flex-col gap-1 text-xs text-dark-500">
        {label}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DAYS}
          value={days}
          disabled={busy}
          onChange={(event) => setDays(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit();
          }}
          className="input w-28 py-2"
        />
      </label>
      <FormButtons
        label={submitLabel}
        danger={danger}
        disabled={busy || !valid}
        onSubmit={() => void submit()}
        onClose={onClose}
      />
    </InlineForm>
  );
}

export function TariffForm({
  tariffs,
  currentTariffId,
  busy,
  onSubmit,
  onClose,
}: FormBaseProps<number> & { tariffs: UserAvailableTariff[]; currentTariffId: number | null }) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState('');
  return (
    <InlineForm id="subscription-tariff">
      <label htmlFor={id} className="flex flex-col gap-1 text-xs text-dark-500">
        {t(`${ns}.newTariff`)}
        <DropdownSelect
          id={id}
          value={value}
          onChange={setValue}
          disabled={busy}
          className="min-w-[14rem]"
          options={[
            { value: '', label: t(`${ns}.selectTariff`) },
            ...tariffs
              .filter((item) => item.id !== currentTariffId)
              .map((item) => ({
                value: String(item.id),
                label: item.is_available ? item.name : `${item.name} ${t(`${ns}.unavailable`)}`,
              })),
          ]}
        />
      </label>
      <FormButtons
        label={t(`${ns}.changeTariff`)}
        disabled={busy || !value}
        onSubmit={async () => {
          if (await onSubmit(Number(value))) onClose();
        }}
        onClose={onClose}
      />
    </InlineForm>
  );
}

export function TrafficForm({
  packages,
  busy,
  onSubmit,
  onClose,
}: FormBaseProps<number> & { packages: string[] }) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState(packages[0] ?? '');
  return (
    <InlineForm id="subscription-traffic" hint={t(`${ns}.addTrafficNote`)}>
      <label htmlFor={id} className="flex flex-col gap-1 text-xs text-dark-500">
        {t(`${ns}.package`)}
        <DropdownSelect
          id={id}
          value={value}
          onChange={setValue}
          disabled={busy}
          className="min-w-[10rem]"
          options={packages.map((gb) => ({ value: gb, label: `${gb} ${t('common.units.gb')}` }))}
        />
      </label>
      <FormButtons
        label={t(`${ns}.addButton`)}
        disabled={busy || !value}
        onSubmit={async () => {
          if (await onSubmit(Number(value))) onClose();
        }}
        onClose={onClose}
      />
    </InlineForm>
  );
}

export function DeviceLimitForm({
  current,
  max,
  busy,
  onSubmit,
  onClose,
}: FormBaseProps<number> & { current: number; max: number | null }) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState(String(current));
  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 1 && (max == null || parsed <= max);
  return (
    <InlineForm hint={max != null ? t(`${ns}.deviceLimitHint`, { max }) : undefined}>
      <label htmlFor={id} className="flex flex-col gap-1 text-xs text-dark-500">
        {t(`${ns}.deviceLimitTitle`)}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={max ?? undefined}
          value={value}
          disabled={busy}
          onChange={(event) => setValue(event.target.value)}
          className="input w-24 py-2"
        />
      </label>
      <FormButtons
        label={t('common.save')}
        disabled={busy || !valid || parsed === current}
        onSubmit={async () => {
          if (await onSubmit(parsed)) onClose();
        }}
        onClose={onClose}
      />
    </InlineForm>
  );
}
