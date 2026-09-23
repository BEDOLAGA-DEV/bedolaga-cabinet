import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { subscriptionApi } from '@/api/subscription';
import { CheckIcon, PencilIcon, PhoneIcon, TrashIcon, XIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { DEVICE_ALIAS_MAX_LENGTH } from '@/constants/devices';
import { useHaptic } from '@/platform';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import type { Subscription } from '@/types';
import { getGlassColors } from '@/utils/glassTheme';
import { useTheme } from '@/hooks/useTheme';

export interface DevicesPanelProps {
  subscription: Subscription;
  subscriptionId: number | undefined;
}

/**
 * Список подключённых устройств: переименование, удаление по одному и все сразу.
 *
 * Вынесен из тела страницы подписки, чтобы им мог пользоваться простой вид.
 * Запрос устройств живёт здесь же и делит ключ ['devices', id] с остальными
 * экранами, так что показ списка не стоит лишнего похода в сеть.
 *
 * Одновременно редактируется одно устройство: `editingDeviceHwid` служит и
 * переключателем, и признаком того, какая строка сейчас правится.
 */
export function DevicesPanel({ subscription, subscriptionId }: DevicesPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const haptic = useHaptic();
  const destructiveConfirm = useDestructiveConfirm();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices', subscriptionId],
    queryFn: () => subscriptionApi.getDevices(subscriptionId),
    enabled: Boolean(subscription),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid, subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
    },
  });

  const deleteAllDevicesMutation = useMutation({
    mutationFn: () => subscriptionApi.deleteAllDevices(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
    },
  });

  const [editingDeviceHwid, setEditingDeviceHwid] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState('');

  const renameDeviceMutation = useMutation({
    mutationFn: ({ hwid, name }: { hwid: string; name: string | null }) =>
      subscriptionApi.renameDevice(hwid, name, subscriptionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });
      // Soft success-tap, like other mutations on this page.
      haptic.notification('success');
      // Не сбрасываем edit-state, если пользователь уже перешёл на другой
      // девайс пока шёл запрос — иначе теряем его новый input. Имя не чистим
      // безусловно: оно либо принадлежит уже другому девайсу (нужно сохранить),
      // либо инпут уже закрылся (значение не отображается).
      setEditingDeviceHwid((current) => (current === variables.hwid ? null : current));
    },
    onError: () => {
      haptic.notification('error');
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight text-dark-50">
          {t('subscription.myDevices')}
        </h2>
        {devicesData && devicesData.devices.length > 0 && (
          <button
            onClick={async () => {
              // Platform-aware destructive confirm: Telegram native popup
              // in Mini App, inline panel on web. Replaces the bare
              // browser confirm() which broke premium frame + lost
              // haptic / theming inside Telegram.
              const confirmed = await destructiveConfirm(
                t('subscription.confirmDeleteAllDevices'),
                t('subscription.deleteAllDevices'),
                t('subscription.deleteAllDevices'),
              );
              if (confirmed) deleteAllDevicesMutation.mutate();
            }}
            disabled={deleteAllDevicesMutation.isPending}
            className="text-[11px] font-medium transition-colors"
            style={{ color: 'rgb(var(--color-critical-500))' }}
          >
            {t('subscription.deleteAllDevices')}
          </button>
        )}
      </div>

      {devicesLoading ? (
        <SkeletonGroup className="space-y-3">
          <Skeleton variant="card" count={3} className="h-16" />
        </SkeletonGroup>
      ) : devicesData && devicesData.devices.length > 0 ? (
        <div className="space-y-2">
          <div className="mb-2 font-mono text-[11px] text-dark-400">
            {devicesData.device_limit === 0
              ? `${devicesData.total} · ∞`
              : `${devicesData.total} / ${t('subscription.devices', { count: devicesData.device_limit })}`}
          </div>
          {devicesData.devices.map((device) => {
            const isEditing = editingDeviceHwid === device.hwid;
            // Display priority: user alias → device model → platform.
            const displayName = device.local_name?.trim() || device.device_model || device.platform;

            return (
              <div
                key={device.hwid}
                className="flex items-center justify-between rounded-[12px] p-3.5"
                style={{
                  background: g.innerBg,
                  border: `1px solid ${g.innerBorder}`,
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: g.trackBg, color: g.textSecondary }}
                  >
                    <PhoneIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingDeviceName}
                        maxLength={DEVICE_ALIAS_MAX_LENGTH}
                        placeholder={device.device_model || device.platform}
                        onChange={(e) => setEditingDeviceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const trimmed = editingDeviceName.trim();
                            renameDeviceMutation.mutate({
                              hwid: device.hwid,
                              name: trimmed || null,
                            });
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingDeviceHwid(null);
                            setEditingDeviceName('');
                          }
                        }}
                        className="w-full rounded-md border-none bg-transparent px-2 py-1 text-sm font-semibold text-dark-50 outline-none focus:ring-1"
                        style={{
                          background: g.trackBg,
                          boxShadow: `inset 0 0 0 1px ${g.innerBorder}`,
                        }}
                      />
                    ) : (
                      <div className="truncate text-sm font-semibold text-dark-50">
                        {displayName}
                      </div>
                    )}
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-dark-400">
                      <span className="truncate">{device.platform}</span>
                      <span className="font-mono text-dark-400">
                        {device.hwid.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = editingDeviceName.trim();
                          renameDeviceMutation.mutate({
                            hwid: device.hwid,
                            name: trimmed || null,
                          });
                        }}
                        disabled={renameDeviceMutation.isPending}
                        className="p-2 transition-colors"
                        style={{ color: g.textSecondary }}
                        title={t('subscription.renameDeviceSave', 'Сохранить')}
                        aria-label={t('subscription.renameDeviceSave', 'Сохранить')}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDeviceHwid(null);
                          setEditingDeviceName('');
                        }}
                        disabled={renameDeviceMutation.isPending}
                        className="p-2 transition-colors"
                        style={{ color: g.textFaint }}
                        title={t('subscription.renameDeviceCancel', 'Отмена')}
                        aria-label={t('subscription.renameDeviceCancel', 'Отмена')}
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDeviceHwid(device.hwid);
                          setEditingDeviceName(device.local_name || '');
                        }}
                        className="p-2 transition-colors"
                        style={{ color: g.textFaint }}
                        title={t('subscription.renameDevice', 'Переименовать')}
                        aria-label={t('subscription.renameDevice', 'Переименовать')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await destructiveConfirm(
                            t('subscription.confirmDeleteDevice'),
                            t('subscription.deleteDevice'),
                            t('subscription.deleteDevice'),
                          );
                          if (confirmed) deleteDeviceMutation.mutate(device.hwid);
                        }}
                        disabled={deleteDeviceMutation.isPending}
                        className="p-2 transition-colors"
                        style={{ color: g.textFaint }}
                        title={t('subscription.deleteDevice')}
                        aria-label={t('subscription.deleteDevice')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-[12px] text-dark-400">
          {t('subscription.noDevices')}
        </div>
      )}
    </>
  );
}

export default DevicesPanel;
