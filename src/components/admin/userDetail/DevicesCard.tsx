import { useTranslation } from 'react-i18next';
import { Card } from '@/components/data-display';
import { CheckIcon, EditIcon, RefreshIcon, XIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import { DEVICE_ALIAS_MAX_LENGTH } from '../../../constants/devices';

export interface DeviceRow {
  hwid: string;
  platform: string;
  device_model: string;
  created_at: string | null;
  local_name?: string | null;
}

interface DevicesCardProps {
  devices: DeviceRow[];
  loading: boolean;
  total: number;
  limit: number;
  disabled: boolean;
  editingHwid: string | null;
  editingName: string;
  renameSaving: boolean;
  locale: string;
  onEditingHwidChange: (hwid: string | null) => void;
  onEditingNameChange: (name: string) => void;
  onRename: (hwid: string) => Promise<void>;
  onDelete: (hwid: string) => Promise<void>;
  onResetAll: () => Promise<void>;
  onRefresh: () => void;
}

export function deviceDisplayName(device: DeviceRow): string {
  return (
    device.local_name?.trim() || device.platform || device.device_model || device.hwid.slice(0, 12)
  );
}

/** Устройства подписки: переименование на месте, удаление и сброс через подтверждение. */
export function DevicesCard(props: DevicesCardProps) {
  const { t } = useTranslation();
  const confirmDestructive = useDestructiveConfirm();
  const {
    devices,
    loading,
    total,
    limit,
    disabled,
    editingHwid,
    editingName,
    renameSaving,
    locale,
    onEditingHwidChange,
    onEditingNameChange,
    onRename,
    onDelete,
    onResetAll,
    onRefresh,
  } = props;

  const remove = async (device: DeviceRow) => {
    if (
      await confirmDestructive(
        t('admin.users.detail.subscription.confirm.deleteDevice', {
          name: deviceDisplayName(device),
        }),
        t('common.delete'),
      )
    )
      await onDelete(device.hwid);
  };

  const resetAll = async () => {
    if (
      await confirmDestructive(
        t('admin.users.detail.subscription.confirm.resetDevices'),
        t('admin.users.detail.devices.resetAll'),
      )
    )
      await onResetAll();
  };

  return (
    <Card size="md" id="subscription-devices" className="flex flex-col gap-3 scroll-mt-24">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 text-lg font-semibold text-dark-100">
          {t('admin.users.detail.devices.title')}
          <span className="ml-2 text-sm font-medium text-dark-400">
            {t('admin.users.detail.facts.devicesValue', { used: total, limit })}
          </span>
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t('common.refresh')}
          className="btn-ghost p-1.5"
        >
          <RefreshIcon className="h-4 w-4" />
        </button>
        {devices.length > 0 && (
          <button
            type="button"
            onClick={resetAll}
            disabled={disabled}
            className="btn-ghost px-2.5 py-1.5 text-xs text-error-400 hover:bg-error-500/10 hover:text-error-400"
          >
            {t('admin.users.detail.devices.resetAll')}
          </button>
        )}
      </div>

      {loading && devices.length === 0 ? (
        <SkeletonGroup className="space-y-2">
          <Skeleton variant="card" count={2} className="h-12" />
        </SkeletonGroup>
      ) : devices.length === 0 ? (
        <p className="text-sm text-dark-500">{t('admin.users.detail.devices.none')}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-dark-800 p-0">
          {devices.map((device) => {
            const editing = editingHwid === device.hwid;
            return (
              <li key={device.hwid} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingName}
                      maxLength={DEVICE_ALIAS_MAX_LENGTH}
                      placeholder={
                        device.platform || device.device_model || device.hwid.slice(0, 12)
                      }
                      onChange={(event) => onEditingNameChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onRename(device.hwid);
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          onEditingHwidChange(null);
                          onEditingNameChange('');
                        }
                      }}
                      className="input py-1.5 text-sm"
                    />
                  ) : (
                    <div className="truncate text-sm font-medium text-dark-100">
                      {deviceDisplayName(device)}
                    </div>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-dark-500">
                    {device.device_model && device.platform && <span>{device.device_model}</span>}
                    <span className="font-mono">{device.hwid.slice(0, 8)}…</span>
                    {device.created_at && (
                      <span>
                        {t('admin.users.detail.subscription.deviceSince', {
                          date: new Date(device.created_at).toLocaleDateString(locale),
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onRename(device.hwid)}
                        disabled={renameSaving}
                        aria-label={t('admin.users.detail.devices.renameSave')}
                        className="btn-ghost p-1.5 text-success-400 hover:text-success-400"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onEditingHwidChange(null);
                          onEditingNameChange('');
                        }}
                        disabled={renameSaving}
                        aria-label={t('common.cancel')}
                        className="btn-ghost p-1.5"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onEditingHwidChange(device.hwid);
                          onEditingNameChange(device.local_name || '');
                        }}
                        aria-label={t('admin.users.detail.devices.rename')}
                        className="btn-ghost p-1.5"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(device)}
                        disabled={disabled}
                        aria-label={t('common.delete')}
                        className="btn-ghost p-1.5 hover:text-error-400"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
