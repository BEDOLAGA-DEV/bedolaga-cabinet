import { useId, useState } from 'react';
import { safeSession } from '@/utils/safeStorage';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subscriptionApi, type SplitTrafficQuote } from '@/api/subscription';
import { formatPrice } from '@/utils/format';
import { ChevronDownIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

type Package = { group: 'ordinary' | 'bs'; gb: number };
type Attempt = { quote: SplitTrafficQuote; key: string };

function recover(storageKey: string): Attempt | null {
  try {
    const value = JSON.parse(safeSession.getItem(storageKey) ?? 'null');
    return value &&
      typeof value.key === 'string' &&
      value.quote &&
      Number.isSafeInteger(value.quote.subscription_id) &&
      Number.isSafeInteger(value.quote.gb) &&
      Number.isSafeInteger(value.quote.price_kopeks) &&
      ['ordinary', 'bs'].includes(value.quote.group)
      ? value
      : null;
  } catch {
    return null;
  }
}

export default function SplitTrafficPurchase({
  subscriptionId,
  packages,
}: {
  subscriptionId: number;
  packages: Package[];
}) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const id = useId();
  const storageKey = `split-purchase:${subscriptionId}`;
  const [attempt, setAttempt] = useState<Attempt | null>(() => recover(storageKey));
  const [selection, setSelection] = useState('');
  const [quote, setQuote] = useState<SplitTrafficQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const displayed = attempt?.quote ?? quote;
  const text = (key: string) => t(`subscription.splitPurchase.${key}`);

  async function preview() {
    const item = packages[Number(selection)];
    if (!item || selection === '') return;
    setBusy(true);
    setMessage('');
    setQuote(null);
    try {
      const result = await subscriptionApi.getSplitTrafficQuote(
        subscriptionId,
        item.group,
        item.gb,
      );
      if (
        result.subscription_id !== subscriptionId ||
        result.group !== item.group ||
        result.gb !== item.gb
      )
        throw new Error();
      setQuote(result);
    } catch {
      setMessage('quoteError');
    } finally {
      setBusy(false);
    }
  }

  async function purchase() {
    if (!displayed || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const current = attempt ?? { quote: displayed, key: crypto.randomUUID() };
      // Persist before sending: reload and network retries must reuse the same receipt key.
      if (!safeSession.setItem(storageKey, JSON.stringify(current))) {
        setMessage('storageUnavailable');
        return;
      }
      setAttempt(current);
      const result = await subscriptionApi.purchaseSplitTraffic(subscriptionId, {
        group: current.quote.group,
        gb: current.quote.gb,
        expected_price_kopeks: current.quote.price_kopeks,
        operation_key: current.key,
      });
      if (result.subscription_id !== subscriptionId) throw new Error();
      if (result.delivery_status === 'verified') {
        safeSession.removeItem(storageKey);
        setAttempt(null);
        setQuote(null);
      }
      setMessage(result.delivery_status === 'verified' ? 'success' : 'pending');
      void client.invalidateQueries({ queryKey: ['split-traffic-summary', subscriptionId] });
      void client.invalidateQueries({ queryKey: ['balance'] });
      void client.invalidateQueries({ queryKey: ['purchase-options'] });
      void client.invalidateQueries({ queryKey: ['subscription'] });
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 409 || status === 422) {
        safeSession.removeItem(storageKey);
        setAttempt(null);
        setQuote(null);
        setMessage('quoteError');
      } else setMessage('retry');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-dark-400/15 pt-4 text-sm">
      {!attempt && (
        <>
          <label htmlFor={id} className="block font-medium text-dark-100">
            {text('title')}
          </label>
          <div className="relative">
            <select
              id={id}
              name="traffic-package"
              autoComplete="off"
              className="input min-h-11 w-full min-w-0 appearance-none pe-10"
              value={selection}
              disabled={busy}
              onChange={(event) => {
                setSelection(event.target.value);
                setQuote(null);
                setMessage('');
              }}
            >
              <option value="">{text('select')}</option>
              {packages.map((item, index) => (
                <option key={`${item.group}-${item.gb}`} value={index}>
                  {t(`subscription.splitTraffic.${item.group}`)} · {item.gb} {t('common.units.gb')}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-dark-300"
            >
              <ChevronDownIcon />
            </span>
          </div>
          {!quote && (
            <button
              type="button"
              className="btn-secondary min-h-11 w-full"
              disabled={busy || selection === ''}
              onClick={() => void preview()}
            >
              {text('quote')}
            </button>
          )}
        </>
      )}
      {busy && !displayed && <Skeleton className="h-12 w-full" />}
      {displayed && (
        <div className="space-y-3">
          <p className="text-dark-100">
            {t(`subscription.splitTraffic.${displayed.group}`)} · {displayed.gb}{' '}
            {t('common.units.gb')}
          </p>
          <p className="font-semibold tabular-nums text-dark-50">
            {formatPrice(displayed.price_kopeks, i18n?.language)}
          </p>
          <p className="text-dark-300">{text('duration')}</p>
          {displayed.missing_kopeks > 0 && !attempt && (
            <p role="status" className="text-warning-400">
              {text('balance')} {formatPrice(displayed.missing_kopeks, i18n?.language)}
            </p>
          )}
          <button
            type="button"
            className="btn-primary min-h-11 w-full"
            disabled={busy || (!attempt && displayed.missing_kopeks > 0)}
            onClick={() => void purchase()}
          >
            {text(busy ? 'processing' : attempt ? 'check' : 'confirm')}
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-dark-300">
          {text(message)}
        </p>
      )}
    </div>
  );
}
