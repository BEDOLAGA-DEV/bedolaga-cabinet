import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export function requiresPaymentPhone(method?: string | null, option?: string | null) {
  return method === 'payhot' && option === 'sberpay';
}

export function isValidPaymentPhone(phone: string) {
  return /^\+7\d{10}$/.test(phone.trim());
}

export default function PaymentPhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const invalid = value.length > 0 && !isValidPaymentPhone(value);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-dark-400">
        {t('balance.paymentPhone')}
      </label>
      <input
        id={id}
        data-payment-phone="true"
        pattern={'\\+7[0-9]{10}'}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={32}
        dir="ltr"
        placeholder="+7XXXXXXXXXX"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        aria-describedby={`${id}-help`}
        className="input w-full"
      />
      <p id={`${id}-help`} className={`text-sm ${invalid ? 'text-error-400' : 'text-dark-400'}`}>
        {t(invalid ? 'balance.paymentPhoneInvalid' : 'balance.paymentPhoneHelp')}
      </p>
    </div>
  );
}
