import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  value: number;
  min: number;
  max: number;
  included: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onValidityChange: (valid: boolean) => void;
}

export function TariffDeviceSelector({
  value,
  min,
  max,
  included,
  disabled,
  onChange,
  onValidityChange,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  const presetMax = Math.min(max, min + 19);
  const [custom, setCustom] = useState(value > presetMax);
  const valid =
    /^\d+$/.test(draft) &&
    Number.isSafeInteger(Number(draft)) &&
    Number(draft) >= min &&
    Number(draft) <= max;
  const change = (next: number) => {
    setDraft(String(next));
    onValidityChange(true);
    onChange(next);
  };
  return (
    <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-4">
      <label htmlFor={id} className="mb-3 block text-sm font-medium text-dark-100">
        {t('subscription.purchaseDevices.title')}
      </label>
      <select
        id={id}
        value={custom || value > presetMax ? 'custom' : String(value)}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        className="h-11 w-full min-w-0 rounded-xl border border-dark-600 bg-dark-900 px-3 text-base text-dark-100 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-50"
        onChange={(event) => {
          if (event.target.value === 'custom') {
            setCustom(true);
            return;
          }
          const next = Number(event.target.value);
          if (!Number.isInteger(next) || next < min || next > max) return;
          setCustom(false);
          change(next);
        }}
      >
        {Array.from({ length: presetMax - min + 1 }, (_, index) => min + index).map((count) => (
          <option key={count} value={count}>
            {count}
          </option>
        ))}
        {max > presetMax && (
          <option value="custom">{t('subscription.purchaseDevices.otherQuantity')}</option>
        )}
      </select>
      {(custom || value > presetMax) && (
        <div className="mt-3">
          <label htmlFor={`${id}-custom`} className="mb-2 block text-xs text-dark-400">
            {t('subscription.purchaseDevices.exactQuantity')}
          </label>
          <input
            id={`${id}-custom`}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={draft}
            disabled={disabled}
            aria-describedby={`${id}-hint${valid ? '' : ` ${id}-error`}`}
            aria-invalid={!valid}
            className="h-11 w-full min-w-0 rounded-xl border border-dark-600 bg-dark-900 px-3 text-base tabular-nums text-dark-100 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-50"
            onChange={(event) => {
              const text = event.target.value;
              setDraft(text);
              const number = Number(text);
              const accepted =
                /^\d+$/.test(text) &&
                Number.isSafeInteger(number) &&
                number >= min &&
                number <= max;
              onValidityChange(accepted);
              if (accepted) onChange(number);
            }}
          />
        </div>
      )}
      <div
        id={`${id}-hint`}
        className="mt-3 min-w-0 space-y-1 break-words text-xs leading-5 text-dark-400"
      >
        <p>{t('subscription.purchaseDevices.includedReason', { count: included })}</p>
        <p
          id={`${id}-error`}
          role={valid ? undefined : 'alert'}
          className={valid ? undefined : 'text-error-400'}
        >
          {valid
            ? t('subscription.purchaseDevices.limitReason', { max })
            : t('subscription.purchaseDevices.range', { min, max })}
        </p>
      </div>
    </div>
  );
}
