import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { subscriptionApi } from '@/api/subscription';
import { usePlatform } from '@/platform';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import { useToast } from '@/components/Toast';
import type { Subscription } from '@/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { getGlassColors } from '@/utils/glassTheme';
import { openPaymentUrl } from '@/utils/openPaymentUrl';
import { uiLocale } from '@/utils/uiLocale';
import {
  isLavaFeatureDisabledError,
  lavaPeriodLabelKey,
  lavaUiState,
  type LavaUiState,
} from '@/utils/lavaRecurring';
import { isRecurringFeatureOff } from '@/utils/recurringFeature';
import {
  isSbpFeatureDisabledError,
  sbpIntervalLabelKey,
  sbpUiState,
  type SbpUiState,
} from '@/utils/sbpRecurring';

export interface RecurringPanelsProps {
  subscription: Subscription;
  subscriptionId: number | undefined;
}

/**
 * Автосписания СБП (Platega) и Lava — два независимых движка с одинаковой
 * семантикой, поэтому живут одним компонентом.
 *
 * Вынесены из тела страницы подписки, чтобы ими мог пользоваться простой вид.
 * Опции покупки компонент спрашивает сам: они нужны ему ради признака
 * «фича включена», а ключ запроса тот же, что и у страницы, так что второго
 * похода в сеть не возникает.
 *
 * Состояние автооплаты спрашивается только у включённой фичи: иначе бэкенд
 * отвечает 403 на каждую подписку, и консоль заливается красными стеками.
 */
export function RecurringPanels({ subscription, subscriptionId }: RecurringPanelsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { openLink, platform } = usePlatform();
  const destructiveConfirm = useDestructiveConfirm();
  const { showToast } = useToast();
  const { formatAmount } = useCurrency();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const purchaseOptionsQuery = useQuery({
    queryKey: ['purchase-options', subscriptionId],
    queryFn: () => subscriptionApi.getPurchaseOptions(subscriptionId),
    staleTime: 0,
  });
  const purchaseOptions = purchaseOptionsQuery.data;

  // Состояние автооплаты спрашиваем, только когда она включена: иначе бэкенд
  // отвечает 403, и браузер печатает красную строку с полным стеком на каждый
  // такой запрос. Ждём ответа опций — до него неизвестно, включена ли фича.
  const featureFlagsSettled = purchaseOptionsQuery.isSuccess || purchaseOptionsQuery.isError;
  const sbpFeatureOff = isRecurringFeatureOff(purchaseOptions, 'platega_recurrent_enabled');
  const lavaFeatureOff = isRecurringFeatureOff(purchaseOptions, 'lava_recurrent_enabled');

  // SBP (Platega) recurring auto-payment status. Polls every 8s while a
  // payment is PENDING (waiting for bank-app confirmation) so the UI flips
  // to 'active'/'past_due' without a manual refresh; stops polling otherwise.
  const sbpQuery = useQuery({
    queryKey: ['sbp-recurring', subscriptionId],
    queryFn: () => subscriptionApi.getSbpRecurring(subscriptionId),
    enabled: !!subscription && !subscription.is_trial && featureFlagsSettled && !sbpFeatureOff,
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 8000 : false),
  });
  const sbpInfo = sbpQuery.data;
  // 403 with a specific detail means the feature itself is disabled on the
  // backend — distinct from "not resolved yet" or "other error", both of
  // which must fail quiet (render nothing) rather than flash the 'off' state.
  const sbpFeatureDisabled = sbpFeatureOff || isSbpFeatureDisabledError(sbpQuery.error);
  const sbpUiStateValue: SbpUiState =
    sbpInfo !== undefined || sbpFeatureDisabled
      ? sbpUiState(sbpInfo, sbpFeatureDisabled)
      : 'hidden';

  const enableSbpMutation = useMutation({
    mutationFn: () => subscriptionApi.enableSbpRecurring(subscriptionId),
    onSuccess: (data) => {
      if (data.redirect_url) {
        openPaymentUrl(data.redirect_url, platform, openLink);
      }
      queryClient.invalidateQueries({ queryKey: ['sbp-recurring', subscriptionId] });
      // Backend flips autopay_enabled off when SBP auto-pay is enabled.
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      showToast({
        type: 'error',
        title: typeof detail === 'string' ? detail : t('subscription.sbpRecurring.enableError'),
        message: '',
        duration: 3000,
      });
    },
  });

  const cancelSbpMutation = useMutation({
    mutationFn: () => subscriptionApi.cancelSbpRecurring(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sbp-recurring', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      showToast({
        type: 'success',
        title: t('subscription.sbpRecurring.cancelled'),
        message: '',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      showToast({
        type: 'error',
        title: typeof detail === 'string' ? detail : t('subscription.sbpRecurring.cancelError'),
        message: '',
        duration: 3000,
      });
    },
  });

  const handleCancelSbp = async () => {
    const confirmed = await destructiveConfirm(
      t('subscription.sbpRecurring.confirmCancel'),
      t('subscription.sbpRecurring.cancel'),
    );
    if (!confirmed) return;
    cancelSbpMutation.mutate();
  };

  // Автопродление Lava — независимый от Platega движок с той же семантикой
  // состояний. Поллинг раз в 8с, пока привязка PENDING (ждём оплату первого
  // счёта), чтобы UI сам перешёл в active/past_due.
  const lavaQuery = useQuery({
    queryKey: ['lava-recurring', subscriptionId],
    queryFn: () => subscriptionApi.getLavaRecurring(subscriptionId),
    enabled: !!subscription && !subscription.is_trial && featureFlagsSettled && !lavaFeatureOff,
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 8000 : false),
  });
  const lavaInfo = lavaQuery.data;
  const lavaFeatureDisabled = lavaFeatureOff || isLavaFeatureDisabledError(lavaQuery.error);
  const lavaUiStateValue: LavaUiState =
    lavaInfo !== undefined || lavaFeatureDisabled
      ? lavaUiState(lavaInfo, lavaFeatureDisabled)
      : 'hidden';

  const enableLavaMutation = useMutation({
    mutationFn: () => subscriptionApi.enableLavaRecurring(subscriptionId),
    onSuccess: (data) => {
      if (data.redirect_url) {
        openPaymentUrl(data.redirect_url, platform, openLink);
      }
      queryClient.invalidateQueries({ queryKey: ['lava-recurring', subscriptionId] });
      // Бэкенд снимает autopay_enabled при включении рекуррента провайдера.
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      showToast({
        type: 'error',
        title: typeof detail === 'string' ? detail : t('subscription.lavaRecurring.enableError'),
        message: '',
        duration: 3000,
      });
    },
  });

  const cancelLavaMutation = useMutation({
    mutationFn: () => subscriptionApi.cancelLavaRecurring(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lava-recurring', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      showToast({
        type: 'success',
        title: t('subscription.lavaRecurring.cancelled'),
        message: '',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      showToast({
        type: 'error',
        title: typeof detail === 'string' ? detail : t('subscription.lavaRecurring.cancelError'),
        message: '',
        duration: 3000,
      });
    },
  });

  const handleCancelLava = async () => {
    const confirmed = await destructiveConfirm(
      t('subscription.lavaRecurring.confirmCancel'),
      t('subscription.lavaRecurring.cancel'),
    );
    if (!confirmed) return;
    cancelLavaMutation.mutate();
  };

  return (
    <>
      {/* ─── SBP Recurring Auto-payment ───
           Sibling of the autopay toggle above, guarded ONLY by
           is_trial + uiState — daily-tariff subscriptions must see
           this block too (backend supports a day-interval charge). */}
      {!subscription.is_trial && sbpUiStateValue !== 'hidden' && (
        <div
          className="mt-3 rounded-[14px] p-3.5"
          style={{
            background: g.innerBg,
            border: `1px solid ${g.innerBorder}`,
          }}
        >
          {/* Заголовок и статус слева, компактное действие справа —
              зеркально соседнему тогглу «Автопродление». На мобиле
              кнопка падает вниз на всю ширину (w-full sm:w-auto). */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-dark-50">
                {t('subscription.sbpRecurring.title')}
              </div>

              {sbpUiStateValue === 'off' && (
                <div className="mt-0.5 text-[11px] text-dark-400">
                  {t('subscription.sbpRecurring.autopayHint')}
                </div>
              )}
              {sbpUiStateValue === 'pending' && (
                <div className="mt-0.5 text-[11px] text-dark-400">
                  {t('subscription.sbpRecurring.statusPending')}
                </div>
              )}
              {sbpUiStateValue === 'active' && sbpInfo && (
                <>
                  <div className="mt-0.5 text-[11px] text-dark-400">
                    {t('subscription.sbpRecurring.amountPerInterval', {
                      amount: formatAmount((sbpInfo.amount_kopeks ?? 0) / 100),
                      interval: t(sbpIntervalLabelKey(sbpInfo.interval)),
                    })}
                  </div>
                  {sbpInfo.next_charge_at && (
                    <div className="mt-0.5 text-[11px] text-dark-400">
                      {t('subscription.sbpRecurring.nextCharge', {
                        date: new Date(sbpInfo.next_charge_at).toLocaleDateString(uiLocale(), {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }),
                      })}
                    </div>
                  )}
                </>
              )}
              {sbpUiStateValue === 'past_due' && (
                <div className="mt-0.5 text-[11px] font-medium text-warning-400">
                  {t('subscription.sbpRecurring.statusPastDue')}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {sbpUiStateValue === 'off' && (
                <button
                  onClick={() => enableSbpMutation.mutate()}
                  disabled={enableSbpMutation.isPending}
                  className="w-full whitespace-nowrap rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-medium text-on-accent transition-opacity disabled:opacity-50 sm:w-auto"
                >
                  {enableSbpMutation.isPending ? (
                    <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t('subscription.sbpRecurring.connect')
                  )}
                </button>
              )}

              {sbpUiStateValue === 'pending' && (
                <>
                  {sbpInfo?.redirect_url && (
                    <button
                      onClick={() => {
                        if (sbpInfo.redirect_url) {
                          openPaymentUrl(sbpInfo.redirect_url, platform, openLink);
                        }
                      }}
                      className="w-full whitespace-nowrap rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-medium text-on-accent transition-opacity sm:w-auto"
                    >
                      {t('subscription.sbpRecurring.confirmInBank')}
                    </button>
                  )}
                  <button
                    onClick={handleCancelSbp}
                    disabled={cancelSbpMutation.isPending}
                    className="text-[11px] font-medium transition-colors disabled:opacity-50 sm:text-right"
                    style={{ color: 'rgb(var(--color-critical-500))' }}
                  >
                    {t('subscription.sbpRecurring.cancel')}
                  </button>
                </>
              )}

              {(sbpUiStateValue === 'active' || sbpUiStateValue === 'past_due') && (
                <button
                  onClick={handleCancelSbp}
                  disabled={cancelSbpMutation.isPending}
                  className="w-full whitespace-nowrap rounded-xl border border-error-500/30 bg-error-500/10 px-5 py-2.5 text-sm font-medium text-error-400 transition-colors hover:bg-error-500/20 disabled:opacity-50 sm:w-auto"
                >
                  {t('subscription.sbpRecurring.cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Автопродление Lava ───
           Независимый от Platega движок: сиблинг того же тоггла, те же
           состояния. Период задан продуктом в кабинете Lava и приезжает
           числом дней, поэтому подпись строится из charge_days. */}
      {!subscription.is_trial && lavaUiStateValue !== 'hidden' && (
        <div
          className="mt-3 rounded-[14px] p-3.5"
          style={{
            background: g.innerBg,
            border: `1px solid ${g.innerBorder}`,
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-dark-50">
                {t('subscription.lavaRecurring.title')}
              </div>

              {lavaUiStateValue === 'off' && (
                <div className="mt-0.5 text-[11px] text-dark-400">
                  {t('subscription.lavaRecurring.autopayHint')}
                </div>
              )}
              {lavaUiStateValue === 'pending' && (
                <div className="mt-0.5 text-[11px] text-dark-400">
                  {t('subscription.lavaRecurring.statusPending')}
                </div>
              )}
              {lavaUiStateValue === 'active' && lavaInfo && (
                <>
                  <div className="mt-0.5 text-[11px] text-dark-400">
                    {(() => {
                      const periodKey = lavaPeriodLabelKey(lavaInfo.charge_days);
                      const amount = formatAmount((lavaInfo.amount_kopeks ?? 0) / 100);
                      return periodKey
                        ? t('subscription.lavaRecurring.amountPerPeriod', {
                            amount,
                            period: t(periodKey),
                          })
                        : t('subscription.lavaRecurring.amountPerDays', {
                            amount,
                            days: lavaInfo.charge_days ?? 0,
                          });
                    })()}
                  </div>
                  {lavaInfo.next_charge_at && (
                    <div className="mt-0.5 text-[11px] text-dark-400">
                      {t('subscription.lavaRecurring.nextCharge', {
                        date: new Date(lavaInfo.next_charge_at).toLocaleDateString(uiLocale(), {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }),
                      })}
                    </div>
                  )}
                </>
              )}
              {lavaUiStateValue === 'past_due' && (
                <div className="mt-0.5 text-[11px] font-medium text-warning-400">
                  {t('subscription.lavaRecurring.statusPastDue')}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {lavaUiStateValue === 'off' && (
                <button
                  onClick={() => enableLavaMutation.mutate()}
                  disabled={enableLavaMutation.isPending}
                  className="w-full whitespace-nowrap rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-medium text-on-accent transition-opacity disabled:opacity-50 sm:w-auto"
                >
                  {enableLavaMutation.isPending ? (
                    <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t('subscription.lavaRecurring.connect')
                  )}
                </button>
              )}

              {lavaUiStateValue === 'pending' && (
                <>
                  {lavaInfo?.redirect_url && (
                    <button
                      onClick={() => {
                        if (lavaInfo.redirect_url) {
                          openPaymentUrl(lavaInfo.redirect_url, platform, openLink);
                        }
                      }}
                      className="w-full whitespace-nowrap rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-medium text-on-accent transition-opacity sm:w-auto"
                    >
                      {t('subscription.lavaRecurring.payFirst')}
                    </button>
                  )}
                  <button
                    onClick={handleCancelLava}
                    disabled={cancelLavaMutation.isPending}
                    className="text-[11px] font-medium transition-colors disabled:opacity-50 sm:text-right"
                    style={{ color: 'rgb(var(--color-critical-500))' }}
                  >
                    {t('subscription.lavaRecurring.cancel')}
                  </button>
                </>
              )}

              {(lavaUiStateValue === 'active' || lavaUiStateValue === 'past_due') && (
                <button
                  onClick={handleCancelLava}
                  disabled={cancelLavaMutation.isPending}
                  className="w-full whitespace-nowrap rounded-xl border border-error-500/30 bg-error-500/10 px-5 py-2.5 text-sm font-medium text-error-400 transition-colors hover:bg-error-500/20 disabled:opacity-50 sm:w-auto"
                >
                  {t('subscription.lavaRecurring.cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RecurringPanels;
