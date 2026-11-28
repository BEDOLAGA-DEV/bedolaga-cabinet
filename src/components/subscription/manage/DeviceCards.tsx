import { useState, type ComponentType, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  PiAndroidLogo,
  PiAppleLogo,
  PiDesktop,
  PiDeviceMobile,
  PiLinuxLogo,
  PiTelevisionSimple,
  PiWindowsLogo,
} from 'react-icons/pi';

import { subscriptionApi } from '@/api/subscription';
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { DEVICE_ALIAS_MAX_LENGTH } from '@/constants/devices';
import { useTheme } from '@/hooks/useTheme';
import { useHaptic } from '@/platform';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import type { Subscription } from '@/types';
import { uiLocale } from '@/utils/uiLocale';
import { getGlassColors } from '@/utils/glassTheme';

export interface DeviceCardsProps {
  subscription: Subscription;
  subscriptionId: number | undefined;
}

type Device = {
  hwid: string;
  platform: string;
  device_model: string;
  created_at: string | null;
  local_name?: string | null;
};

type PlatformKind = 'apple' | 'android' | 'windows' | 'linux' | 'tv' | 'desktop' | 'other';

const PLATFORM_ICONS: Record<PlatformKind, ComponentType<{ className?: string }>> = {
  apple: PiAppleLogo,
  android: PiAndroidLogo,
  windows: PiWindowsLogo,
  linux: PiLinuxLogo,
  tv: PiTelevisionSimple,
  desktop: PiDesktop,
  other: PiDeviceMobile,
};

/**
 * Платформа приходит из панели свободной строкой («iOS», «Android», «Windows»,
 * «macOS», «Linux», «AndroidTV»…), иногда в модели лежит больше подсказок,
 * чем в платформе. Смотрим на обе. ТВ проверяем раньше Android/Apple.
 */
export function platformKind(device: Pick<Device, 'platform' | 'device_model'>): PlatformKind {
  const s = `${device.platform} ${device.device_model}`.toLowerCase();
  if (/\btv\b|tv\b|television|tvos/.test(s)) return 'tv';
  if (/ios|iphone|ipad|mac|darwin|apple/.test(s)) return 'apple';
  if (/android/.test(s)) return 'android';
  if (/windows|win\d/.test(s)) return 'windows';
  if (/linux|ubuntu|debian|fedora/.test(s)) return 'linux';
  if (/desktop|pc\b/.test(s)) return 'desktop';
  return 'other';
}

/**
 * Устройства подписки карточками: значок платформы, имя, модель, дата добавления,
 * HWID для поддержки. Свободные места — отдельная пунктирная карточка, которая
 * ведёт на подключение. Замена upstream-<DevicesPanel> только по виду:
 * запросы, ключ кэша ['devices', id] и логика правки те же.
 */
export function DeviceCards({ subscription, subscriptionId }: DeviceCardsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const haptic = useHaptic();
  const destructiveConfirm = useDestructiveConfirm();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const { data, isLoading } = useQuery({
    queryKey: ['devices', subscriptionId],
    queryFn: () => subscriptionApi.getDevices(subscriptionId),
    enabled: Boolean(subscription),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['devices', subscriptionId] });

  const deleteDevice = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid, subscriptionId),
    onSuccess: () => {
      haptic.notification('success');
      invalidate();
    },
    onError: () => haptic.notification('error'),
  });

  const deleteAll = useMutation({
    mutationFn: () => subscriptionApi.deleteAllDevices(subscriptionId),
    onSuccess: () => {
      haptic.notification('success');
      invalidate();
    },
    onError: () => haptic.notification('error'),
  });

  const [editingHwid, setEditingHwid] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const rename = useMutation({
    mutationFn: ({ hwid, name }: { hwid: string; name: string | null }) =>
      subscriptionApi.renameDevice(hwid, name, subscriptionId),
    onSuccess: (_d, vars) => {
      invalidate();
      haptic.notification('success');
      // Пользователь мог уже открыть правку другого устройства — её не трогаем.
      setEditingHwid((cur) => (cur === vars.hwid ? null : cur));
    },
    onError: () => haptic.notification('error'),
  });

  const saveRename = (hwid: string) => rename.mutate({ hwid, name: editingName.trim() || null });
  const cancelRename = () => {
    setEditingHwid(null);
    setEditingName('');
  };

  const devices: Device[] = data?.devices ?? [];
  const limit = data?.device_limit ?? subscription.device_limit ?? 0;
  const unlimited = limit === 0;
  const free = unlimited ? null : Math.max(0, limit - devices.length);
  const canConnect = Boolean(subscription.subscription_url) && (unlimited || (free ?? 0) > 0);
  const showMeter = !unlimited && limit > 1 && limit <= 10;

  const goConnect = () => {
    haptic.impact?.('light');
    navigate(`/connection?sub=${subscription.id}`);
  };

  return (
    <section aria-labelledby="device-cards-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="device-cards-title" className="text-lg font-bold tracking-tight text-dark-50">
          {t('subscription.myDevices')}
        </h2>
        {data && (
          <span className="text-sm font-medium tabular-nums text-dark-400">
            {unlimited
              ? t('deviceCards.countUnlimited', '{{count}} · без ограничений', {
                  count: devices.length,
                })
              : t('deviceCards.countOf', '{{used}} из {{limit}}', {
                  used: devices.length,
                  limit,
                })}
          </span>
        )}
      </div>

      {showMeter && data && (
        <div className="mb-4 flex gap-1" aria-hidden="true">
          {Array.from({ length: limit }, (_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-500"
              style={{
                background: i < devices.length ? 'rgb(var(--color-accent-500))' : g.trackBg,
              }}
            />
          ))}
        </div>
      )}

      {isLoading ? (
        <SkeletonGroup className="grid gap-2 sm:grid-cols-2">
          <Skeleton variant="card" count={2} className="h-[132px]" />
        </SkeletonGroup>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {devices.map((device) => {
            const kind = platformKind(device);
            const Icon = PLATFORM_ICONS[kind];
            const isEditing = editingHwid === device.hwid;
            const alias = device.local_name?.trim();
            const title = alias || device.device_model || device.platform;
            // Под именем — то, чего нет в заголовке: модель (если имя своё) и платформа.
            const meta = [alias ? device.device_model : null, device.platform]
              .filter((v) => v && v !== title)
              .join(' · ');
            const added = formatAdded(device.created_at);
            const isDeleting = deleteDevice.isPending && deleteDevice.variables === device.hwid;

            return (
              <article
                key={device.hwid}
                className="flex flex-col rounded-2xl p-4 transition-opacity duration-300"
                style={{
                  background: g.innerBg,
                  border: `1px solid ${g.innerBorder}`,
                  opacity: isDeleting ? 0.45 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: 'rgba(var(--color-accent-500), 0.1)',
                      color: 'rgb(var(--color-accent-400))',
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        maxLength={DEVICE_ALIAS_MAX_LENGTH}
                        placeholder={device.device_model || device.platform}
                        aria-label={t('subscription.renameDevicePlaceholder')}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveRename(device.hwid);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        // 16px: iOS не зумит поле при фокусе.
                        className="w-full rounded-lg px-2.5 py-1.5 text-base font-semibold text-dark-50 outline-none focus:ring-2 focus:ring-accent-500/40"
                        style={{ background: g.trackBg, border: `1px solid ${g.innerBorder}` }}
                      />
                    ) : (
                      <div className="truncate text-[15px] font-semibold leading-snug text-dark-50">
                        {title}
                      </div>
                    )}
                    {meta && <div className="mt-0.5 truncate text-sm text-dark-400">{meta}</div>}
                    {added && (
                      <div className="mt-0.5 text-xs text-dark-500">
                        {t('deviceCards.added', 'Добавлено {{date}}', { date: added })}
                      </div>
                    )}
                  </div>

                  <div className="-mr-2 -mt-2 flex flex-shrink-0">
                    {isEditing ? (
                      <>
                        <IconButton
                          label={t('subscription.renameDeviceSave', 'Сохранить')}
                          onClick={() => saveRename(device.hwid)}
                          disabled={rename.isPending}
                          color="rgb(var(--color-accent-400))"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </IconButton>
                        <IconButton
                          label={t('subscription.renameDeviceCancel', 'Отмена')}
                          onClick={cancelRename}
                          disabled={rename.isPending}
                          color={g.textFaint}
                        >
                          <XIcon className="h-5 w-5" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          label={t('subscription.renameDevice', 'Переименовать')}
                          onClick={() => {
                            setEditingHwid(device.hwid);
                            setEditingName(device.local_name || '');
                          }}
                          color={g.textFaint}
                        >
                          <PencilIcon className="h-[18px] w-[18px]" />
                        </IconButton>
                        <IconButton
                          label={t('subscription.deleteDevice')}
                          disabled={deleteDevice.isPending}
                          color={g.textFaint}
                          onClick={async () => {
                            const ok = await destructiveConfirm(
                              t('subscription.confirmDeleteDevice'),
                              t('subscription.deleteDevice'),
                              t('subscription.deleteDevice'),
                            );
                            if (ok) deleteDevice.mutate(device.hwid);
                          }}
                        >
                          <TrashIcon className="h-[18px] w-[18px]" />
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>

                {/* HWID целиком и выделяемым — его просит поддержка. */}
                <div
                  className="mt-3 border-t pt-2.5 font-mono text-xs leading-relaxed text-dark-500"
                  style={{ borderColor: g.innerBorder }}
                >
                  <span className="select-all break-all">{device.hwid}</span>
                </div>
              </article>
            );
          })}

          {canConnect && (
            <button
              type="button"
              onClick={goConnect}
              className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition-colors duration-200 hover:bg-accent-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50"
              style={{ borderColor: 'rgba(var(--color-accent-500), 0.35)' }}
            >
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 ease-out group-active:scale-95"
                style={{
                  background: 'rgba(var(--color-accent-500), 0.1)',
                  color: 'rgb(var(--color-accent-400))',
                }}
              >
                <PlusIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-dark-50">
                  {devices.length === 0
                    ? t('deviceCards.connectFirst', 'Подключить первое устройство')
                    : t('deviceCards.connectMore', 'Подключить устройство')}
                </span>
                <span className="mt-0.5 block text-sm text-dark-400">
                  {free === null
                    ? t('deviceCards.freeUnlimited', 'Без ограничения по количеству')
                    : t('deviceCards.freeSlots', 'Свободно мест: {{count}}', { count: free })}
                </span>
              </span>
            </button>
          )}

          {!canConnect && devices.length === 0 && (
            <div className="py-6 text-center text-sm text-dark-400 sm:col-span-2">
              {t('subscription.noDevices')}
            </div>
          )}
        </div>
      )}

      {!unlimited && free === 0 && devices.length > 0 && (
        <p className="mt-3 text-sm text-dark-400">
          {t(
            'deviceCards.limitReached',
            'Все места заняты. Чтобы подключить новое устройство, удалите старое.',
          )}
        </p>
      )}

      {devices.length > 1 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={deleteAll.isPending}
            onClick={async () => {
              const ok = await destructiveConfirm(
                t('subscription.confirmDeleteAllDevices'),
                t('subscription.deleteAllDevices'),
                t('subscription.deleteAllDevices'),
              );
              if (ok) deleteAll.mutate();
            }}
            className="rounded-lg px-2 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: 'rgb(var(--color-critical-500))' }}
          >
            {t('deviceCards.deleteAll', 'Удалить все ({{count}})', { count: devices.length })}
          </button>
        </div>
      )}
    </section>
  );
}

/** «12 октября», а для прошлых лет — «12 октября 2025 г.». */
function formatAdded(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(uiLocale(), {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

function IconButton({
  label,
  onClick,
  disabled,
  color,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 disabled:opacity-40"
      style={{ color }}
    >
      {children}
    </button>
  );
}

export default DeviceCards;
