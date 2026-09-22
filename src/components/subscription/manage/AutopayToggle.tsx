import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { subscriptionApi } from '@/api/subscription';
import type { Subscription } from '@/types';
import { showsAutopayToggle } from '@/utils/legacySubscription';

export interface AutopayToggleProps {
  subscription: Subscription;
  subscriptionId: number | undefined;
  /** Цвет включённого тумблера — акцент зоны трафика на полной странице. */
  accentColor: string;
  /** Цвет выключенного тумблера. */
  offColor: string;
  /** Фон и рамка плашки; без них компонент рисуется без подложки. */
  surface?: { background: string; border: string };
}

/**
 * Тумблер автоплатежа с баланса.
 *
 * Вынесен из тела страницы подписки, чтобы тем же тумблером мог пользоваться
 * простой вид. Мутация живёт здесь: она инвалидирует ещё и состояние
 * СБП-автоплатежа — включение списания с баланса отменяет его на стороне
 * сервера, и без этого сброса блок СБП продолжал бы показывать протухшее
 * «активен».
 *
 * Возвращает null, когда тумблер неуместен (пробные, суточные и старые
 * подписки) — решение принимает общий помощник, а не вызывающий экран.
 */
export function AutopayToggle({
  subscription,
  subscriptionId,
  accentColor,
  offColor,
  surface,
}: AutopayToggleProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const autopayMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      subscriptionApi.updateAutopay(enabled, undefined, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      // Enabling balance-autopay cancels SBP auto-pay server-side — refresh so
      // the SBP block doesn't keep showing a now-stale 'active'/'pending' state.
      queryClient.invalidateQueries({ queryKey: ['sbp-recurring', subscriptionId] });
    },
  });

  if (!showsAutopayToggle(subscription)) return null;

  return (
    <div
      className="flex items-center justify-between rounded-[14px] p-3.5"
      style={
        surface
          ? { background: surface.background, border: `1px solid ${surface.border}` }
          : undefined
      }
    >
      <div>
        <div className="text-sm font-semibold text-dark-50">{t('subscription.autoRenewal')}</div>
        <div className="mt-0.5 text-[11px] text-dark-400">
          {t('subscription.daysBeforeExpiry', { count: subscription.autopay_days_before })}
        </div>
      </div>
      <button
        type="button"
        onClick={() => autopayMutation.mutate(!subscription.autopay_enabled)}
        disabled={autopayMutation.isPending}
        role="switch"
        aria-checked={subscription.autopay_enabled}
        aria-label={t('subscription.autopay', 'Auto-payment')}
        className="relative h-7 w-[52px] rounded-full transition-colors duration-300"
        style={{ background: subscription.autopay_enabled ? accentColor : offColor }}
      >
        {/* translateX (compositor) instead of left (layout-thrash).
            Resting position pinned at left:3px; on toggles a 23px
            slide on the GPU. */}
        <span
          className="absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-transform duration-300"
          style={{
            transform: subscription.autopay_enabled ? 'translateX(23px)' : 'translateX(0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}

export default AutopayToggle;
