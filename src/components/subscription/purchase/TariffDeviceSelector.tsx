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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-sm font-medium text-dark-100">
            {t('subscription.purchaseDevices.title')}
          </label>
          <p id={`${id}-hint`} className="mt-1 text-xs text-dark-400">
            {t('subscription.purchaseDevices.included', { count: included })}
          </p>
        </div>
        <div className="flex items-center gap-2" dir="ltr">
          <button
            type="button"
            className="btn-secondary h-11 w-11 p-0"
            disabled={disabled || value <= min}
            aria-label={t('subscription.purchaseDevices.decrease')}
            onClick={() => change(Math.max(min, value - 1))}
          >
            −
          </button>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={draft}
            disabled={disabled}
            aria-describedby={`${id}-hint${valid ? '' : ` ${id}-error`}`}
            aria-invalid={!valid}
            className="h-11 w-20 rounded-lg border border-dark-600 bg-dark-900/50 px-2 text-center text-base tabular-nums text-dark-100 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
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
          <button
            type="button"
            className="btn-secondary h-11 w-11 p-0"
            disabled={disabled || value >= max}
            aria-label={t('subscription.purchaseDevices.increase')}
            onClick={() => change(Math.min(max, value + 1))}
          >
            +
          </button>
        </div>
      </div>
      {!valid && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-error-400">
          {t('subscription.purchaseDevices.range', { min, max })}
        </p>
      )}
    </div>
  );
}
