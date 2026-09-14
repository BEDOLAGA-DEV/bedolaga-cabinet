import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, DevicesIcon, EditIcon, XIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import { formatShortDate } from '@/utils/format';
import { DEVICE_ALIAS_MAX_LENGTH } from '../../../constants/devices';
import { Section } from './sectionParts';

export interface DeviceRow {
  hwid: string;
  platform: string;
  device_model: string;
  created_at: string | null;
  local_name?: string | null;
}

/** Имя устройства для человека: своё название, иначе модель, иначе платформа. */
export function deviceDisplayName(device: DeviceRow): string {
  return (
    device.local_name?.trim() || device.device_model || device.platform || device.hwid.slice(0, 12)
  );
}

/** «Айфон (iPhone 15 Pro)» — своё название и модель, если они разные. */
export function deviceLongName(device: DeviceRow): string {
  const name = deviceDisplayName(device);
  const model = device.device_model;
  return device.local_name?.trim() && model && model !== name ? `${name} (${model})` : name;
}

interface DevicesCardProps {
  devices: DeviceRow[];
  loading: boolean;
  limit: number;
  busy: boolean;
  canManage: boolean;
  onRename: (hwid: string, name: string) => Promise<boolean>;
  onDelete: (hwid: string) => Promise<boolean>;
  onResetAll: () => Promise<boolean>;
}

/** Устройства подписки: переименование на месте, удаление и сброс через подтверждение. */
export function DevicesCard({
  devices,
  loading,
  limit,
  busy,
  canManage,
  onRename,
  onDelete,
  onResetAll,
}: DevicesCardProps) {
  const { t } = useTranslation();
  const confirmDestructive = useDestructiveConfirm();
  const [editing, setEditing] = useState<{ hwid: string; name: string } | null>(null);
  const ns = 'admin.users.detail';

  const save = async () => {
    if (editing && (await onRename(editing.hwid, editing.name))) setEditing(null);
  };

  const remove = async (device: DeviceRow) => {
    const ok = await confirmDestructive(
      t(`${ns}.subscription.confirm.deleteDevice`, { name: deviceDisplayName(device) }),
      t('common.delete'),
    );
    if (ok) await onDelete(device.hwid);
  };

  const resetAll = async () => {
    const ok = await confirmDestructive(
      t(`${ns}.subscription.confirm.resetDevices`),
      t(`${ns}.devices.resetAll`),
    );
    if (ok) await onResetAll();
  };

  return (
    <Section
      id="subscription-devices"
      icon={<DevicesIcon className="h-5 w-5" />}
      title={
        <>
          {t(`${ns}.devices.title`)}
          <span className="ml-2 text-sm font-medium text-dark-400">
            {t(`${ns}.facts.devicesValue`, { used: devices.length, limit })}
          </span>
        </>
      }
      action={
        canManage &&
        devices.length > 0 && (
          // Действие, а не переход — кнопкой, как остальные действия карточки.
          <button
            type="button"
            onClick={resetAll}
            disabled={busy}
            className="btn-secondary min-h-0 px-3 py-1.5 text-xs"
          >
            {t(`${ns}.devices.resetAll`)}
          </button>
        )
      }
    >
      {loading && devices.length === 0 ? (
        <SkeletonGroup className="space-y-2">
          <Skeleton variant="card" count={2} className="h-12" />
        </SkeletonGroup>
      ) : devices.length === 0 ? (
        <p className="text-sm text-dark-500">{t(`${ns}.devices.none`)}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
          {devices.map((device) => {
            const isEditing = editing?.hwid === device.hwid;
            const subtitle = [
              device.local_name?.trim() ? device.device_model : null,
              device.platform,
              device.created_at
                ? t(`${ns}.subscription.deviceSince`, { date: formatShortDate(device.created_at) })
                : null,
            ].filter(Boolean);
            return (
              <li key={device.hwid} className="flex items-center gap-3 py-2.5" title={device.hwid}>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editing.name}
                      maxLength={DEVICE_ALIAS_MAX_LENGTH}
                      placeholder={device.device_model || device.platform}
                      aria-label={t(`${ns}.devices.rename`)}
                      onChange={(event) =>
                        setEditing({ hwid: device.hwid, name: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void save();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditing(null);
                        }
                      }}
                      className="input py-1.5 text-sm"
                    />
                  ) : (
                    <div className="truncate text-sm font-medium text-dark-100">
                      {deviceDisplayName(device)}
                    </div>
                  )}
                  <div className="mt-0.5 truncate text-xs text-dark-500">
                    {subtitle.join(' · ')}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void save()}
                          disabled={busy}
                          aria-label={t(`${ns}.devices.renameSave`)}
                          className="btn-ghost p-2 text-success-400 hover:text-success-400"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          disabled={busy}
                          aria-label={t('common.cancel')}
                          className="btn-ghost p-2"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({ hwid: device.hwid, name: device.local_name ?? '' })
                          }
                          aria-label={t(`${ns}.devices.rename`)}
                          className="btn-ghost p-2"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(device)}
                          disabled={busy}
                          aria-label={t('common.delete')}
                          className="btn-ghost p-2 hover:text-error-400"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
