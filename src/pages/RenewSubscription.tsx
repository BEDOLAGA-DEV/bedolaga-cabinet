import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import { subscriptionApi } from '../api/subscription';
import { useTheme } from '../hooks/useTheme';
import { getGlassColors } from '../utils/glassTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useHaptic } from '../platform';
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt';
import { WebBackButton } from '../components/WebBackButton';

export default function RenewSubscription() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const subId = subscriptionId ? Number(subscriptionId) : undefined;

  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const { formatAmount, currencySymbol } = useCurrency();
  const { impact } = useHaptic();

  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load subscription detail for tariff name
  const { data: subscriptionResponse } = useQuery({
    queryKey: ['subscription', subId],
    queryFn: () => subscriptionApi.getSubscription(subId),
    enabled: !!subId,
    staleTime: 30_000,
  });
  const subscription = subscriptionResponse?.subscription ?? null;

  // Load renewal options
  const { data: options, isLoading } = useQuery({
    queryKey: ['renewal-options', subId],
    queryFn: () => subscriptionApi.getRenewalOptions(subId),
    enabled: !!subId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Load balance
  const { data: purchaseOptions } = useQuery({
    queryKey: ['purchase-options', subId],
    queryFn: () => subscriptionApi.getPurchaseOptions(subId),
    staleTime: 0,
  });
  const balanceKopeks = purchaseOptions?.balance_kopeks ?? 0;

  const renewMutation = useMutation({
    mutationFn: (periodDays: number) => subscriptionApi.renewSubscription(periodDays, subId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['renewal-options', subId] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      navigate(`/subscriptions/${subId}`, { replace: true });
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail ?? null)
          : null;

      if (detail && typeof detail === 'object' && 'code' in (detail as Record<string, unknown>)) {
        const typed = detail as { code: string; missing_amount?: number };
        if (typed.code === 'insufficient_funds' && typed.missing_amount) {
          setError(`insufficient:${typed.missing_amount}`);
          return;
        }
      }
      setError(typeof detail === 'string' ? detail : t('common.error'));
    },
  });

  const handleRenew = (periodDays: number) => {
    impact('medium');
    setError(null);
    renewMutation.mutate(periodDays);
  };

  if (!subId) {
    return <Navigate to="/subscriptions" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  const insufficientMatch = error?.match(/^insufficient:(\d+)$/);
  const missingAmount = insufficientMatch ? Number(insufficientMatch[1]) : null;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center gap-3">
        <WebBackButton to={`/subscriptions/${subId}`} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: g.text }}>
            {t('subscription.extend', 'Продлить подписку')}
          </h1>
          {subscription?.tariff_name && (
            <p className="mt-1 text-sm" style={{ color: g.textSecondary }}>
              {subscription.tariff_name}
            </p>
          )}
        </div>
      </div>

      {/* Balance */}
      <div
        className="flex items-center justify-between rounded-2xl p-4"
        style={{ background: g.cardBg, border: `1px solid ${g.cardBorder}` }}
      >
        <span className="text-sm" style={{ color: g.textSecondary }}>
          {t('common.balance', 'Баланс')}
        </span>
        <span className="text-base font-semibold" style={{ color: g.text }}>
          {formatAmount(balanceKopeks / 100)} {currencySymbol}
        </span>
      </div>

      {/* Period options */}
      {!options || options.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: g.cardBg, border: `1px solid ${g.cardBorder}` }}
        >
          <p style={{ color: g.textSecondary }}>
            {t('subscription.noRenewalOptions', 'Нет доступных вариантов продления')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const isSelected = selectedPeriod === option.period_days;
            const canAfford = balanceKopeks >= option.price_kopeks;
            const months = Math.max(1, Math.round(option.period_days / 30));
            const perMonth = option.price_kopeks / months;

            return (
              <button
                key={option.period_days}
                onClick={() => {
                  impact('light');
                  setSelectedPeriod(option.period_days);
                  setError(null);
                }}
                className="w-full rounded-2xl border p-4 text-left transition-all duration-200"
                style={{
                  background: isSelected
                    ? isDark
                      ? 'rgba(var(--color-accent-400), 0.08)'
                      : 'rgba(var(--color-accent-400), 0.05)'
                    : g.cardBg,
                  borderColor: isSelected ? 'rgb(var(--color-accent-400))' : g.cardBorder,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-semibold" style={{ color: g.text }}>
                      {option.period_days} {t('common.units.days', 'дней')}
                    </span>
                    {option.discount_percent > 0 && (
                      <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        -{option.discount_percent}%
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold" style={{ color: g.text }}>
                      {option.price_kopeks === 0
                        ? t('subscription.free', 'Бесплатно')
                        : `${formatAmount(option.price_kopeks / 100)} ${currencySymbol}`}
                    </div>
                    {months > 1 && (
                      <div className="text-[11px]" style={{ color: g.textSecondary }}>
                        {formatAmount(perMonth / 100)} {currencySymbol}/
                        {t('common.units.mo', 'мес')}
                      </div>
                    )}
                    {option.original_price_kopeks && (
                      <div className="text-[11px] line-through" style={{ color: g.textSecondary }}>
                        {formatAmount(option.original_price_kopeks / 100)} {currencySymbol}
                      </div>
                    )}
                  </div>
                </div>
                {!canAfford && (
                  <div className="mt-1 text-[11px] text-red-400">
                    {t(
                      'subscription.insufficientBalanceAmount',
                      'Недостаточно средств. Не хватает {{missing}}',
                      {
                        missing: `${formatAmount((option.price_kopeks - balanceKopeks) / 100)} ${currencySymbol}`,
                      },
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Insufficient balance prompt */}
      {missingAmount && <InsufficientBalancePrompt missingAmountKopeks={missingAmount} compact />}

      {/* Error */}
      {error && !missingAmount && (
        <div className="rounded-xl bg-red-400/10 p-3 text-center text-sm text-red-400">{error}</div>
      )}

      {/* Renew button */}
      {selectedPeriod && (
        <button
          onClick={() => handleRenew(selectedPeriod)}
          disabled={renewMutation.isPending}
          className="w-full rounded-2xl bg-accent-500 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
        >
          {renewMutation.isPending
            ? t('common.processing', 'Обработка...')
            : t('subscription.extend', 'Продлить подписку')}
        </button>
      )}
    </div>
  );
}
