import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '@/api/subscription';
import { DevicesIcon, PlusIcon, TrashIcon, WarningIcon } from '@/components/icons';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { getApiErrorMessage } from '@/utils/api-error';

interface DeviceLimitSheetProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: number;
  subscriptionName: string;
  deviceLimit: number;
  isTrial: boolean;
  devices: Array<{
    hwid: string;
    platform: string;
    device_model: string;
    local_name?: string | null;
  }>;
  /** Уводит на страницу подписки, где живёт докупка слотов. */
  onOpenSubscription: () => void;
}

/**
 * Почему нельзя подключить ещё одно устройство и что с этим делать.
 *
 * Открывается из подвала карточки, когда слоты кончились. Заблокировать
 * кнопку было бы проще, но человек остался бы без выхода: реальных действий
 * тут два — освободить слот или добавить ещё.
 */
export function DeviceLimitSheet({
  isOpen,
  onClose,
  subscriptionId,
  subscriptionName,
  deviceLimit,
  isTrial,
  devices,
  onOpenSubscription,
}: DeviceLimitSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Докупка слотов недоступна на тестовой подписке и при безлимите — ровно
  // те же условия, что у блока докупки на странице подписки.
  const canAddSlots = !isTrial && deviceLimit !== 0;

  const disconnect = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid, subscriptionId),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
      onClose();
    },
    onError: (err) =>
      setError(getApiErrorMessage(err, t('common.error', 'Не удалось выполнить действие'))),
  });

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('subscription.connectFooter.full', 'Все слоты заняты')}
    >
      <div className="space-y-4 px-4 pb-6 sm:px-5">
        <div className="flex items-start gap-3 rounded-2xl bg-warning-400/10 p-3.5">
          <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning-400" />
          <p className="text-[13px] leading-snug text-dark-200">
            {canAddSlots
              ? t('subscription.connectFooter.limitExplained', {
                  defaultValue:
                    'Тариф «{{name}}» даёт {{count}} слота, и все заняты. Освободите слот или добавьте ещё.',
                  name: subscriptionName,
                  count: deviceLimit,
                })
              : t('subscription.connectFooter.limitExplainedNoTopup', {
                  defaultValue:
                    'Тариф «{{name}}» даёт {{count}} слота, и все заняты. Освободите занятый слот.',
                  name: subscriptionName,
                  count: deviceLimit,
                })}
          </p>
        </div>

        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-dark-500">
            {t('subscription.connectFooter.connectedDevices', 'Подключённые устройства')}
          </div>
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.hwid}
                className="flex items-center gap-3 rounded-xl bg-dark-800/60 px-3 py-2.5"
              >
                <DevicesIcon className="h-4 w-4 shrink-0 opacity-40" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-dark-100">
                    {device.local_name || device.device_model || device.platform}
                  </div>
                  <div className="text-[11px] text-dark-500">{device.platform}</div>
                </div>
                <button
                  type="button"
                  disabled={disconnect.isPending}
                  onClick={() => disconnect.mutate(device.hwid)}
                  className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg bg-error-500/10 px-2.5 text-[12px] font-medium text-error-400 transition-colors hover:bg-error-500/20 disabled:opacity-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  {t('subscription.connectFooter.disconnect', 'Отключить')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-error-500/10 px-3 py-2 text-[12px] text-error-400">{error}</p>
        )}

        {canAddSlots ? (
          <button type="button" onClick={onOpenSubscription} className="btn-primary w-full">
            <PlusIcon className="h-4 w-4" />
            {t('subscription.connectFooter.addSlots', 'Добавить слоты')}
          </button>
        ) : (
          <p className="rounded-xl bg-dark-800/60 px-3 py-2.5 text-[12px] leading-snug text-dark-400">
            {t(
              'subscription.connectFooter.noTopupHint',
              'На тестовой подписке слоты докупить нельзя — освободите занятый или оформите платный тариф.',
            )}
          </p>
        )}
      </div>
    </ResponsiveSheet>
  );
}
