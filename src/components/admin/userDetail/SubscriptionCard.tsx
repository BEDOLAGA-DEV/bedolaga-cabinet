import { useTranslation } from 'react-i18next';
import type {
  UserAvailableTariff,
  UserPanelInfo,
  UserSubscriptionInfo,
  UserTransactionItem,
} from '@/api/adminUsers';
import {
  SubscriptionStateChip,
  TrafficBar,
  useMoney,
  useTrafficLabel,
} from '@/components/admin/users';
import { SubscriptionIcon, XIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useDestructiveConfirm, useNativeDialog } from '@/platform/hooks/useNativeDialog';
import { formatShortDate } from '@/utils/format';
import { formatGb } from '@/utils/formatNumber';
import { uiLocale } from '@/utils/uiLocale';
import { usePaymentMethodLabel } from './ActivityRows';
import { DaysForm, DeviceLimitForm, TariffForm, TrafficForm } from './SubscriptionForms';
import { KeyValues, LinkAction, Section } from './sectionParts';

export type SubscriptionPanel = 'extend' | 'shorten' | 'tariff' | 'traffic' | 'devices';

export interface SubscriptionCardActions {
  extend: (days: number) => Promise<boolean>;
  shorten: (days: number) => Promise<boolean>;
  changeTariff: (tariffId: number) => Promise<boolean>;
  activate: () => Promise<boolean>;
  addTraffic: (gb: number) => Promise<boolean>;
  removeTraffic: (purchaseId: number) => Promise<boolean>;
  setDeviceLimit: (limit: number) => Promise<boolean>;
  cancelSbp: () => Promise<boolean>;
}

interface SubscriptionCardProps {
  sub: UserSubscriptionInfo;
  tariffs: UserAvailableTariff[];
  currentTariff: UserAvailableTariff | null;
  panelInfo: UserPanelInfo | null;
  /** Последняя оплата подписки — из операций карточки. */
  lastPayment: UserTransactionItem | null;
  canManage: boolean;
  busy: boolean;
  openPanel: SubscriptionPanel | null;
  onOpenPanel: (panel: SubscriptionPanel | null) => void;
  actions: SubscriptionCardActions;
}

const BYTES_IN_GB = 1024 ** 3;
const ns = 'admin.users.detail.subscription';

/**
 * Карточка подписки: факты парами, трафик и явные действия вместо селекта
 * «Продлить / Сократить / …». Каждое действие раскрывает свою маленькую форму
 * под рядом кнопок; открыта всегда одна.
 */
export function SubscriptionCard({
  sub,
  tariffs,
  currentTariff,
  panelInfo,
  lastPayment,
  canManage,
  busy,
  openPanel,
  onOpenPanel,
  actions,
}: SubscriptionCardProps) {
  const { t } = useTranslation();
  const dialog = useNativeDialog();
  const confirmDestructive = useDestructiveConfirm();
  const money = useMoney();
  const trafficLabel = useTrafficLabel();
  const methodLabel = usePaymentMethodLabel();

  const usedGb = panelInfo?.found
    ? panelInfo.used_traffic_bytes / BYTES_IN_GB
    : sub.traffic_used_gb;
  const inactive = sub.status === 'expired' || sub.status === 'disabled';
  const topupPackages =
    currentTariff?.traffic_topup_enabled && currentTariff.traffic_topup_packages
      ? Object.keys(currentTariff.traffic_topup_packages).sort((a, b) => Number(a) - Number(b))
      : [];
  const toggle = (panel: SubscriptionPanel) => onOpenPanel(openPanel === panel ? null : panel);
  const endsAt = sub.end_date
    ? new Date(sub.end_date).toLocaleString(uiLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const facts = [
    {
      key: 'until',
      label: t(`${ns}.validUntil`),
      value:
        sub.days_remaining > 0
          ? `${endsAt} · ${t('admin.users.detail.facts.days', { count: sub.days_remaining })}`
          : endsAt,
    },
    ...(lastPayment
      ? [
          {
            key: 'paid',
            label: t(`${ns}.lastPayment`),
            value: [
              formatShortDate(lastPayment.created_at),
              money(Math.abs(lastPayment.amount_rubles)),
              lastPayment.payment_method ? methodLabel(lastPayment.payment_method) : null,
            ]
              .filter(Boolean)
              .join(', '),
          },
        ]
      : []),
    {
      key: 'autopay',
      label: t(`${ns}.autopay`),
      value: sub.autopay_enabled ? t(`${ns}.autopayOn`) : t(`${ns}.autopayOff`),
    },
    ...(sub.sbp_recurring_status
      ? [
          {
            key: 'sbp',
            label: t(`${ns}.sbpTitle`),
            value: (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                {t(`${ns}.sbpStatus_${sub.sbp_recurring_status}`, sub.sbp_recurring_status)}
                {canManage && (
                  <LinkAction
                    disabled={busy}
                    onClick={async () => {
                      if (await dialog.confirm(t(`${ns}.confirm.cancelSbp`), t(`${ns}.sbpTitle`)))
                        await actions.cancelSbp();
                    }}
                  >
                    {t(`${ns}.sbpCancel`)}
                  </LinkAction>
                )}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <Section
      id="subscription-extend"
      icon={<SubscriptionIcon className="h-5 w-5" />}
      title={`${sub.tariff_name ?? t(`${ns}.notSpecified`)} · #${sub.id}`}
      action={<SubscriptionStateChip status={sub.status} />}
    >
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
        <KeyValues rows={facts} />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-dark-500">{t('admin.users.detail.overview.trafficPeriod')}</span>
            <span className="font-medium tabular-nums text-dark-200">
              {trafficLabel(usedGb, sub.traffic_limit_gb)}
            </span>
          </div>
          <TrafficBar usedGb={usedGb} limitGb={sub.traffic_limit_gb} label={false} />
          {sub.purchased_traffic_gb > 0 && (
            <span className="text-xs text-dark-500">
              {t(`${ns}.purchasedExtra`, { gb: formatGb(sub.purchased_traffic_gb) })}
            </span>
          )}
          {sub.traffic_purchases.length > 0 && (
            <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
              {sub.traffic_purchases.map((purchase) => (
                <li
                  key={purchase.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full bg-dark-800 py-0.5 pl-2.5 text-[11px]',
                    purchase.is_expired
                      ? 'pr-2.5 text-dark-500 line-through'
                      : 'pr-1 text-dark-300',
                  )}
                >
                  {formatGb(purchase.traffic_gb)} {t('common.units.gb')}
                  {!purchase.is_expired && (
                    <span className="text-dark-500">
                      · {t('admin.users.detail.facts.days', { count: purchase.days_remaining })}
                    </span>
                  )}
                  {!purchase.is_expired && canManage && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={t(`${ns}.removePackage`)}
                      onClick={async () => {
                        const ok = await confirmDestructive(
                          t(`${ns}.confirm.removePackage`, { gb: purchase.traffic_gb }),
                          t(`${ns}.removePackage`),
                        );
                        if (ok) await actions.removeTraffic(purchase.id);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-dark-500 hover:bg-error-500/15 hover:text-error-400"
                    >
                      <XIcon className="h-3 w-3" />
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
          {/* «Продлить ▾» — в шапке карточки, на всех вкладках; здесь его не повторяем.
              Её «другой срок…» открывает форму ниже (`?do=extend`). */}
          <div className="flex flex-wrap gap-2">
            {inactive && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void actions.activate()}
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
              aria-expanded={openPanel === 'shorten'}
              className={cn('btn-ghost', openPanel === 'shorten' && 'bg-dark-800 text-dark-100')}
            >
              {t(`${ns}.shortenTitle`)}…
            </button>
          </div>

          {openPanel === 'extend' && (
            <DaysForm
              label={t(`${ns}.extendDays`)}
              submitLabel={t(`${ns}.extend`)}
              busy={busy}
              defaultDays={30}
              onSubmit={actions.extend}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'shorten' && (
            <DaysForm
              label={t(`${ns}.shortenDays`)}
              submitLabel={t(`${ns}.shorten`)}
              busy={busy}
              defaultDays={1}
              danger
              onSubmit={async (days) => {
                const ok = await confirmDestructive(
                  t(`${ns}.confirm.shorten`, { count: days }),
                  t(`${ns}.shorten`),
                );
                return ok ? actions.shorten(days) : false;
              }}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'tariff' && (
            <TariffForm
              tariffs={tariffs}
              currentTariffId={sub.tariff_id}
              busy={busy}
              onSubmit={actions.changeTariff}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'traffic' && (
            <TrafficForm
              packages={topupPackages}
              busy={busy}
              onSubmit={actions.addTraffic}
              onClose={() => onOpenPanel(null)}
            />
          )}
          {openPanel === 'devices' && (
            <DeviceLimitForm
              current={sub.device_limit}
              max={currentTariff?.max_device_limit ?? null}
              busy={busy}
              onSubmit={actions.setDeviceLimit}
              onClose={() => onOpenPanel(null)}
            />
          )}
        </>
      )}
    </Section>
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
