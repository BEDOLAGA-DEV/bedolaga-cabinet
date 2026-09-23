import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { subscriptionApi } from '@/api/subscription';
import { ArrowPathIcon } from '@/components/icons';
import { useHaptic } from '@/platform';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import type { Subscription } from '@/types';
import { safeLocal } from '@/utils/safeStorage';
import { getErrorMessage } from '@/utils/subscriptionHelpers';

/** Пауза между перевыпусками, секунды. Ограничение панели, не наше. */
const REVOKE_COOLDOWN_SECONDS = 900;

/**
 * Есть ли что перевыпускать.
 *
 * Экспортируется отдельно, потому что вызывающий экран рисует вокруг кнопки
 * свою подложку: без этой проверки у пробной подписки оставалась бы пустая
 * карточка от блока, которого нет.
 */
export function canReissueLink(
  subscription: Pick<Subscription, 'is_active' | 'is_limited' | 'is_trial'>,
): boolean {
  return (subscription.is_active || subscription.is_limited) && !subscription.is_trial;
}

export interface ReissueLinkButtonProps {
  subscription: Subscription;
  subscriptionId: number | undefined;
}

/**
 * Перевыпуск ссылки подписки.
 *
 * Вынесен из тела страницы подписки, чтобы им мог пользоваться простой вид.
 * Действие разрушительное: панель сбрасывает привязки устройств, поэтому
 * подтверждение и пауза в 15 минут — часть компонента, а не вызывающего
 * экрана. Отсчёт паузы переживает перезагрузку: метка времени лежит в
 * хранилище, иначе человек обходил бы ограничение обновлением страницы.
 *
 * Возвращает null там, где перевыпускать нечего: у пробных и у неактивных.
 */
export function ReissueLinkButton({ subscription, subscriptionId }: ReissueLinkButtonProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const haptic = useHaptic();
  const destructiveConfirm = useDestructiveConfirm();
  const storageKey = `revoke_ts_${subscriptionId ?? 'default'}`;

  const [cooldown, setCooldown] = useState(() => {
    const last = Number(safeLocal.getItem(storageKey) || '0');
    if (!last) return 0;
    const passed = Math.floor((Date.now() - last) / 1000);
    return Math.max(0, REVOKE_COOLDOWN_SECONDS - passed);
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const revokeMutation = useMutation({
    mutationFn: () => subscriptionApi.revokeSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['connection-link', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      // Remnawave resets device HWIDs on revoke — make sure the cabinet
      // re-reads the now-empty device list instead of showing the stale cache.
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
      haptic.notification('success');
      safeLocal.setItem(storageKey, Date.now().toString());
      setCooldown(REVOKE_COOLDOWN_SECONDS);
    },
    onError: () => {
      haptic.notification('error');
    },
  });

  const handleRevoke = async () => {
    const confirmed = await destructiveConfirm(
      t('subscription.revoke.warning'),
      t('subscription.revoke.confirmBtn'),
      t('subscription.revoke.title'),
    );
    if (!confirmed) return;
    revokeMutation.mutate();
  };

  if (!canReissueLink(subscription)) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleRevoke}
        disabled={revokeMutation.isPending || cooldown > 0}
        className="w-full rounded-xl border border-warning-500/30 bg-warning-500/10 p-4 text-left transition-colors hover:bg-warning-500/20 disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-warning-400">{t('subscription.revoke.button')}</div>
            <div className="mt-1 text-sm text-dark-400">
              {cooldown > 0
                ? t('subscription.revoke.cooldown', {
                    minutes: Math.floor(cooldown / 60),
                    seconds: cooldown % 60,
                  })
                : t('subscription.revoke.description')}
            </div>
          </div>
          <div className="text-warning-400">
            {revokeMutation.isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-warning-400/30 border-t-amber-400" />
            ) : (
              <ArrowPathIcon className="h-5 w-5" />
            )}
          </div>
        </div>
      </button>
      {revokeMutation.error && (
        <p className="mt-2 text-sm text-error-400">{getErrorMessage(revokeMutation.error)}</p>
      )}
    </>
  );
}

export default ReissueLinkButton;
