import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserAvailableTariff, UserPanelInfo, UserSubscriptionInfo } from '@/api/adminUsers';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { TrafficBar, UserStatusChip } from '@/components/admin/users';
import { Card } from '@/components/data-display';
import { ChevronDownIcon, SubscriptionIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useDestructiveConfirm, useNativeDialog } from '@/platform/hooks/useNativeDialog';

export type SubscriptionPanel = 'extend' | 'shorten' | 'tariff' | 'traffic' | 'devices';

interface SubscriptionCardProps {
  sub: UserSubscriptionInfo;
  accountStatus: string;
  /** В мультитарифе показываем номер подписки — их несколько. */
  multi: boolean;
  tariffs: UserAvailableTariff[];
  currentTariff: UserAvailableTariff | null;
  panelInfo: UserPanelInfo | null;
  devicesTotal: number;
  canManage: boolean;
  disabled: boolean;
  openPanel: SubscriptionPanel | null;
  onOpenPanel: (panel: SubscriptionPanel | null) => void;
  onExtend: (days: number) => Promise<void>;
  onShorten: (days: number) => Promise<void>;
  onChangeTariff: (tariffId: number) => Promise<void>;
  onActivate: () => Promise<void>;
  onAddTraffic: (gb: number) => Promise<void>;
  onRemoveTraffic: (purchaseId: number) => Promise<void>;
  onSetDeviceLimit: (limit: number) => Promise<void>;
  onCancelSbp: () => Promise<void>;
  formatDate: (date: string | null) => string;
}

const EXTEND_PRESETS = [7, 30, 90] as const;
const BYTES_IN_GB = 1024 ** 3;
const ns = 'admin.users.detail.subscription';

/**
 * Карточка подписки: факты, полоса трафика и явные действия вместо селекта
 * «Продлить / Сократить / …». Каждое действие раскрывает свою маленькую форму
 * под рядом кнопок; открыта всегда одна.
 */
export function SubscriptionCard(props: SubscriptionCardProps) {
  const { t } = useTranslation();
  const dialog = useNativeDialog();
  const confirmDestructive = useDestructiveConfirm();
  const {
    sub,
    accountStatus,
    multi,
    tariffs,
    currentTariff,
    panelInfo,
    devicesTotal,
    canManage,
    disabled,
    openPanel,
    onOpenPanel,
    onExtend,
    onShorten,
    onChangeTariff,
    onActivate,
    onAddTraffic,
    onRemoveTraffic,
    onSetDeviceLimit,
    onCancelSbp,
    formatDate,
  } = props;

  const usedGb = panelInfo?.found
    ? panelInfo.used_traffic_bytes / BYTES_IN_GB
    : sub.traffic_used_gb;
  const inactive = sub.status === 'expired' || sub.status === 'disabled';
  const topupPackages =
    currentTariff?.traffic_topup_enabled && currentTariff.traffic_topup_packages
      ? Object.keys(currentTariff.traffic_topup_packages).sort((a, b) => Number(a) - Number(b))
      : [];

  const toggle = (panel: SubscriptionPanel) => onOpenPanel(openPanel === panel ? null : panel);

  return (
    <Card size="md" id="subscription-extend" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SubscriptionIcon className="h-5 w-5 text-accent-400" />
        <h2 className="text-lg font-semibold text-dark-100">
          {sub.tariff_name ?? t(`${ns}.notSpecified`)}
        </h2>
        <UserStatusChip
          user={{
            status: accountStatus,
            has_subscription: true,
            subscription_status: sub.status,
            subscription_is_trial: sub.is_trial,
            days_remaining: sub.days_remaining,
            subscription_end_date: sub.end_date,
          }}
        />
        <span className="text-xs text-dark-500">
          {multi ? `#${sub.id} · ` : ''}
          {sub.autopay_enabled
            ? t('admin.users.detail.overview.autopayOn')
            : t('admin.users.detail.overview.autopayOff')}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-dark-500">{t(`${ns}.validUntil`)}</dt>
          <dd className="m-0 text-dark-100">
            {formatDate(sub.end_date)}
            {sub.days_remaining > 0 && (
              <span className="text-dark-400">
                {' '}
                · {t('admin.users.detail.facts.days', { count: sub.days_remaining })}
              </span>
            )}
          </dd>
          <dt className="text-dark-500">{t(`${ns}.devices`)}</dt>
          <dd className="m-0 text-dark-100">
            {t('admin.users.detail.facts.devicesValue', {
              used: devicesTotal,
              limit: sub.device_limit,
            })}
          </dd>
          {sub.sbp_recurring_status && (
            <>
              <dt className="text-dark-500">{t(`${ns}.sbpTitle`)}</dt>
              <dd className="m-0 flex flex-wrap items-center gap-2 text-dark-100">
                {t(`${ns}.sbpStatus_${sub.sbp_recurring_status}`, sub.sbp_recurring_status)}
                {canManage && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={async () => {
                      if (await dialog.confirm(t(`${ns}.confirm.cancelSbp`), t(`${ns}.sbpTitle`)))
                        await onCancelSbp();
                    }}
                    className="text-xs font-semibold text-warning-400 hover:text-warning-300"
                  >
                    {t(`${ns}.sbpCancel`)}
                  </button>
                )}
              </dd>
            </>
          )}
        </dl>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-dark-400">
            <span>{t('admin.users.detail.overview.trafficPeriod')}</span>
            {sub.purchased_traffic_gb > 0 && (
              <span>{t(`${ns}.purchasedExtra`, { gb: sub.purchased_traffic_gb })}</span>
            )}
          </div>
          <TrafficBar usedGb={usedGb} limitGb={sub.traffic_limit_gb} />
          {sub.traffic_purchases.length > 0 && (
            <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
              {sub.traffic_purchases.map((purchase) => (
                <li
                  key={purchase.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]',
                    purchase.is_expired
                      ? 'bg-dark-800 text-dark-500 line-through'
                      : 'bg-dark-800 text-dark-300',
                  )}
                >
                  {purchase.traffic_gb} {t('common.units.gb')}
                  {!purchase.is_expired && (
                    <span className="text-dark-500">
                      · {t('admin.users.detail.facts.days', { count: purchase.days_remaining })}
                    </span>
                  )}
                  {!purchase.is_expired && canManage && (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={t(`${ns}.removePackage`)}
                      onClick={async () => {
                        if (
                          await confirmDestructive(
                            t(`${ns}.confirm.removePackage`, { gb: purchase.traffic_gb }),
                            t(`${ns}.removePackage`),
                          )
                        )
                          await onRemoveTraffic(purchase.id);
                      }}
                      className="text-dark-500 hover:text-error-400"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {canManage && (
        <>
          <div className="flex flex-wrap gap-2">
            <ExtendMenu
              disabled={disabled}
              onPick={(days) => onExtend(days)}
              onCustom={() => onOpenPanel('extend')}
            />
            {inactive && (
              <button
                type="button"
                disabled={disabled}
                onClick={onActivate}
                className="btn-secondary"
              >
                {t(`${ns}.activate`)}
              </button>
            )}
            <PanelButton active={openPanel === 'tariff'} onClick={() => toggle('tariff')}>
              {t(`${ns}.changeTariff`)}
            </PanelButton>
            {topupPackages.length > 0 && (
              <PanelButton active={openPanel === 'traffic'} onClick={() => toggle('traffic')}>
                {t(`${ns}.addTraffic`)}
              </PanelButton>
            )}
            <PanelButton active={openPanel === 'devices'} onClick={() => toggle('devices')}>
              {t(`${ns}.deviceLimitTitle`)}
            </PanelButton>
            <button
              type="button"
              onClick={() => toggle('shorten')}
              className={cn('btn-ghost', openPanel === 'shorten' && 'bg-dark-800 text-dark-100')}
            >
              {t(`${ns}.shortenTitle`)}…
            </button>
          </div>

          {openPanel === 'extend' && (
            <DaysForm
              label={t(`${ns}.extend`)}
              submitLabel={t(`${ns}.extend`)}
              disabled={disabled}
              defaultDays={30}
              onSubmit={onExtend}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'shorten' && (
            <DaysForm
              label={t(`${ns}.shortenTitle`)}
              submitLabel={t(`${ns}.shorten`)}
              disabled={disabled}
              defaultDays={1}
              danger
              onSubmit={async (days) => {
                if (
                  await confirmDestructive(
                    t(`${ns}.confirm.shorten`, { count: days }),
                    t(`${ns}.shorten`),
                  )
                )
                  await onShorten(days);
              }}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'tariff' && (
            <TariffForm
              tariffs={tariffs}
              currentTariffId={sub.tariff_id}
              disabled={disabled}
              onSubmit={onChangeTariff}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'traffic' && (
            <TrafficForm
              packages={topupPackages}
              disabled={disabled}
              onSubmit={onAddTraffic}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'devices' && (
            <DeviceLimitForm
              current={sub.device_limit}
              max={currentTariff?.max_device_limit ?? null}
              disabled={disabled}
              onSubmit={onSetDeviceLimit}
              onClose={() => onOpenPanel(null)}
            />
          )}
        </>
      )}
    </Card>
  );
}

function PanelButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cn('btn-secondary', active && 'border-accent-500/40 text-accent-400')}
    >
      {children}
    </button>
  );
}

interface ExtendMenuProps {
  disabled: boolean;
  onPick: (days: number) => void;
  onCustom: () => void;
}

/** «Продлить ▾»: три частых срока и «другой срок…», без промежуточного селекта. */
function ExtendMenu({ disabled, onPick, onCustom }: ExtendMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="btn-primary"
      >
        {t(`${ns}.extend`)}
        <ChevronDownIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-12 z-30 w-56 rounded-2xl border border-dark-700 bg-dark-800 p-1.5 shadow-2xl"
        >
          {EXTEND_PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(days);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-dark-200 hover:bg-dark-700"
            >
              {t(`${ns}.extendBy`, { count: days })}
            </button>
          ))}
          <div className="my-1 border-t border-dark-700" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCustom();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-dark-200 hover:bg-dark-700"
          >
            {t(`${ns}.customDays`)}
          </button>
        </div>
      )}
    </div>
  );
}

interface DaysFormProps {
  label: string;
  submitLabel: string;
  disabled: boolean;
  defaultDays: number;
  danger?: boolean;
  onSubmit: (days: number) => Promise<void>;
  onClose: () => void;
}

function DaysForm({
  label,
  submitLabel,
  disabled,
  defaultDays,
  danger,
  onSubmit,
  onClose,
}: DaysFormProps) {
  const { t } = useTranslation();
  const id = useId();
  const [days, setDays] = useState(String(defaultDays));
  const parsed = Number(days);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 3650;
  return (
    <InlineForm>
      <label htmlFor={id} className="text-xs text-dark-500">
        {label}: {t(`${ns}.days`).toLowerCase()}
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={3650}
        value={days}
        disabled={disabled}
        onChange={(event) => setDays(event.target.value)}
        className="input w-28 py-2"
      />
      <button
        type="button"
        disabled={disabled || !valid}
        onClick={async () => {
          await onSubmit(parsed);
          onClose();
        }}
        className={danger ? 'btn-danger' : 'btn-primary'}
      >
        {submitLabel}
      </button>
      <button type="button" onClick={onClose} className="btn-ghost">
        {t('common.cancel')}
      </button>
    </InlineForm>
  );
}

interface TariffFormProps {
  tariffs: UserAvailableTariff[];
  currentTariffId: number | null;
  disabled: boolean;
  onSubmit: (tariffId: number) => Promise<void>;
  onClose: () => void;
}

function TariffForm({ tariffs, currentTariffId, disabled, onSubmit, onClose }: TariffFormProps) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState('');
  return (
    <InlineForm id="subscription-tariff">
      <label htmlFor={id} className="text-xs text-dark-500">
        {t(`${ns}.changeTariff`)}
      </label>
      <DropdownSelect
        id={id}
        value={value}
        onChange={setValue}
        disabled={disabled}
        className="min-w-[220px]"
        options={[
          { value: '', label: t(`${ns}.selectTariff`) },
          ...tariffs
            .filter((item) => item.id !== currentTariffId)
            .map((item) => ({
              value: String(item.id),
              label: item.is_available ? item.name : `${item.name} ${t(`${ns}.unavailable`)}`,
            })),
        ]}
      />
      <button
        type="button"
        disabled={disabled || !value}
        onClick={async () => {
          await onSubmit(Number(value));
          onClose();
        }}
        className="btn-primary"
      >
        {t('admin.users.actions.apply')}
      </button>
      <button type="button" onClick={onClose} className="btn-ghost">
        {t('common.cancel')}
      </button>
    </InlineForm>
  );
}

interface TrafficFormProps {
  packages: string[];
  disabled: boolean;
  onSubmit: (gb: number) => Promise<void>;
  onClose: () => void;
}

function TrafficForm({ packages, disabled, onSubmit, onClose }: TrafficFormProps) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState('');
  return (
    <InlineForm id="subscription-traffic" hint={t(`${ns}.addTrafficNote`)}>
      <label htmlFor={id} className="text-xs text-dark-500">
        {t(`${ns}.addTraffic`)}
      </label>
      <DropdownSelect
        id={id}
        value={value}
        onChange={setValue}
        disabled={disabled}
        className="min-w-[180px]"
        options={[
          { value: '', label: t(`${ns}.selectPackage`) },
          ...packages.map((gb) => ({ value: gb, label: `${gb} ${t('common.units.gb')}` })),
        ]}
      />
      <button
        type="button"
        disabled={disabled || !value}
        onClick={async () => {
          await onSubmit(Number(value));
          onClose();
        }}
        className="btn-primary"
      >
        {t(`${ns}.addButton`)}
      </button>
      <button type="button" onClick={onClose} className="btn-ghost">
        {t('common.cancel')}
      </button>
    </InlineForm>
  );
}

interface DeviceLimitFormProps {
  current: number;
  max: number | null;
  disabled: boolean;
  onSubmit: (limit: number) => Promise<void>;
  onClose: () => void;
}

function DeviceLimitForm({ current, max, disabled, onSubmit, onClose }: DeviceLimitFormProps) {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = useState(String(current));
  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 1 && (max == null || parsed <= max);
  return (
    <InlineForm hint={max != null ? t(`${ns}.deviceLimitHint`, { max }) : undefined}>
      <label htmlFor={id} className="text-xs text-dark-500">
        {t(`${ns}.deviceLimitTitle`)}
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={max ?? undefined}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        className="input w-24 py-2"
      />
      <button
        type="button"
        disabled={disabled || !valid || parsed === current}
        onClick={async () => {
          await onSubmit(parsed);
          onClose();
        }}
        className="btn-primary"
      >
        {t('common.save')}
      </button>
      <button type="button" onClick={onClose} className="btn-ghost">
        {t('common.cancel')}
      </button>
    </InlineForm>
  );
}

function InlineForm({
  id,
  hint,
  children,
}: {
  id?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="flex scroll-mt-24 flex-col gap-2 rounded-xl border border-dark-700 bg-dark-800/60 p-3"
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {hint && <p className="text-xs text-dark-500">{hint}</p>}
    </div>
  );
}
