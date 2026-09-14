import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  UpdateRestrictionsRequest,
  UserActivityItem,
  UserDetailResponse,
  UserPanelInfo,
  UserSubscriptionInfo,
} from '@/api/adminUsers';
import type { PromoGroup } from '@/api/promocodes';
import { Toggle } from '@/components/admin/Toggle';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { TrafficBar, UserStatusChip } from '@/components/admin/users';
import { Card } from '@/components/data-display';
import {
  CampaignIcon,
  ClockIcon,
  GlobeIcon,
  ShieldIcon,
  SubscriptionIcon,
} from '@/components/icons';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/format';
import { relativeTimeParts } from '@/utils/relativeTime';
import { describeItem } from './activityLabels';

export type DetailTab = 'overview' | 'subscription' | 'balance' | 'referrals' | 'activity';

export interface OverviewTabProps {
  user: UserDetailResponse;
  subscription: UserSubscriptionInfo | null;
  panelInfo: UserPanelInfo | null;
  devices: { total: number; limit: number; names: string[] } | null;
  promoGroups: PromoGroup[];
  canEditPromoGroup: boolean;
  canEditRestrictions: boolean;
  canManageSubscription: boolean;
  actionLoading: boolean;
  onChangePromoGroup: (groupId: number | null) => Promise<void>;
  onUpdateRestrictions: (data: UpdateRestrictionsRequest) => Promise<void>;
  onGoTo: (tab: DetailTab, view?: string) => void;
  ticketsCount: number | null;
  giftsCount: number | null;
  recentActivity: UserActivityItem[] | null;
  formatDate: (date: string | null) => string;
}

const EXPENSE_SUBTYPES = new Set(['withdrawal', 'subscription_payment', 'gift_payment']);
const BYTES_IN_GB = 1024 ** 3;

/**
 * «Обзор» — первый экран карточки: подписка с действиями, подключение, откуда
 * человек пришёл, ограничения с обращениями и последние события. Всё, что
 * поддержке нужно в первые десять секунд, без прокрутки на десктопе.
 */
export function OverviewTab(props: OverviewTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const {
    user,
    subscription,
    panelInfo,
    devices,
    promoGroups,
    canEditPromoGroup,
    canEditRestrictions,
    canManageSubscription,
    actionLoading,
    onChangePromoGroup,
    onUpdateRestrictions,
    onGoTo,
    ticketsCount,
    giftsCount,
    recentActivity,
    formatDate,
  } = props;

  const online = relativeTimeParts(panelInfo?.online_at ?? null);
  const hasRestrictions = user.restriction_topup || user.restriction_subscription;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        icon={<SubscriptionIcon className="h-5 w-5" />}
        title={t('admin.users.detail.overview.subscription')}
        action={
          subscription && (
            <TabLink onClick={() => onGoTo('subscription')}>
              {t('admin.users.detail.overview.allDetails')}
            </TabLink>
          )
        }
      >
        {subscription ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-dark-100">
                {subscription.tariff_name ?? t('admin.users.detail.subscription.notSpecified')}
              </span>
              <UserStatusChip
                user={{
                  status: user.status,
                  has_subscription: true,
                  subscription_status: subscription.status,
                  subscription_is_trial: subscription.is_trial,
                  days_remaining: subscription.days_remaining,
                  subscription_end_date: subscription.end_date,
                }}
              />
              <span className="text-xs text-dark-500">
                #{subscription.id} ·{' '}
                {subscription.autopay_enabled
                  ? t('admin.users.detail.overview.autopayOn')
                  : t('admin.users.detail.overview.autopayOff')}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-dark-400">
                <span>{t('admin.users.detail.overview.trafficPeriod')}</span>
              </div>
              <TrafficBar
                usedGb={subscription.traffic_used_gb}
                limitGb={subscription.traffic_limit_gb}
              />
              <div className="flex items-center justify-between text-xs text-dark-400">
                <span>
                  {t('admin.users.until', { date: formatShortDate(subscription.end_date) })}
                  {subscription.days_remaining > 0 &&
                    ` · ${t('admin.users.detail.facts.days', { count: subscription.days_remaining })}`}
                </span>
                {devices && (
                  <span>
                    {t('admin.users.detail.overview.devicesShort', {
                      used: devices.total,
                      limit: subscription.device_limit,
                    })}
                  </span>
                )}
              </div>
            </div>
            {canManageSubscription && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onGoTo('subscription', 'extend')}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  {t('admin.users.detail.overview.extend')}
                </button>
                <button
                  type="button"
                  onClick={() => onGoTo('subscription', 'tariff')}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  {t('admin.users.detail.overview.changeTariff')}
                </button>
                <button
                  type="button"
                  onClick={() => onGoTo('subscription', 'traffic')}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  {t('admin.users.detail.overview.addTraffic')}
                </button>
                <button
                  type="button"
                  onClick={() => onGoTo('subscription', 'devices')}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  {t('admin.users.detail.overview.deviceLimit')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-dark-400">
              {t('admin.users.detail.overview.noSubscription')}
            </p>
            {canManageSubscription && (
              <button
                type="button"
                onClick={() => onGoTo('subscription', 'create')}
                className="btn-primary px-3 py-2 text-sm"
              >
                {t('admin.users.detail.overview.createSubscription')}
              </button>
            )}
          </div>
        )}
      </Section>

      <Section
        icon={<GlobeIcon className="h-5 w-5" />}
        title={t('admin.users.detail.overview.connection')}
        action={
          subscription && (
            <TabLink onClick={() => onGoTo('subscription', 'devices')}>
              {t('admin.users.detail.overview.devicesAndTech')}
            </TabLink>
          )
        }
      >
        {panelInfo?.found ? (
          <Facts
            rows={[
              {
                label: t('admin.users.detail.overview.now'),
                value: (
                  <span
                    className={cn(
                      'inline-flex items-center gap-2',
                      online.isOnline && 'text-success-400',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-2 w-2 rounded-full',
                        online.isOnline
                          ? 'bg-success-400 shadow-[0_0_6px_rgba(var(--color-success-400),0.6)]'
                          : 'bg-dark-600',
                      )}
                    />
                    {online.isOnline
                      ? t('common.relative.online')
                      : online.key === 'never'
                        ? t('common.relative.never')
                        : t(`common.relative.${online.key}`, { count: online.count })}
                    {panelInfo.last_connected_node_name && (
                      <span className="text-dark-400">· {panelInfo.last_connected_node_name}</span>
                    )}
                  </span>
                ),
              },
              {
                label: t('admin.users.detail.overview.firstConnection'),
                value: panelInfo.first_connected_at
                  ? formatShortDate(panelInfo.first_connected_at)
                  : '—',
              },
              {
                label: t('admin.users.detail.overview.devices'),
                value:
                  devices && devices.names.length > 0
                    ? devices.names.join(', ')
                    : t('admin.users.detail.overview.noDevices'),
              },
              {
                label: t('admin.users.detail.overview.lifetimeTraffic'),
                value: `${(panelInfo.lifetime_used_traffic_bytes / BYTES_IN_GB).toFixed(1).replace(/\.0$/, '')} ${t('common.units.gb')}`,
              },
            ]}
          />
        ) : (
          <p className="text-sm text-dark-500">{t('admin.users.detail.overview.noPanelData')}</p>
        )}
      </Section>

      <Section
        icon={<CampaignIcon className="h-5 w-5" />}
        title={t('admin.users.detail.overview.origin')}
      >
        <Facts
          rows={[
            {
              label: t('admin.users.detail.overview.registered'),
              value: formatDate(user.created_at),
            },
            {
              label: t('admin.users.detail.overview.campaign'),
              value: user.campaign_name ?? '—',
            },
            {
              label: t('admin.users.detail.overview.promoGroup'),
              value: (
                <PromoGroupField
                  user={user}
                  promoGroups={promoGroups}
                  canEdit={canEditPromoGroup}
                  disabled={actionLoading}
                  onChange={onChangePromoGroup}
                />
              ),
            },
            {
              label: t('admin.users.detail.overview.referrer'),
              value: user.referral.referred_by_username ? (
                `@${user.referral.referred_by_username}`
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="text-dark-500">{t('admin.users.detail.overview.nobody')}</span>
                  <TabLink onClick={() => onGoTo('referrals')}>
                    {t('admin.users.detail.referrals.assignReferrer')}
                  </TabLink>
                </span>
              ),
            },
            {
              label: t('admin.users.detail.overview.cabinetLogin'),
              value: user.cabinet_last_login ? formatDate(user.cabinet_last_login) : '—',
            },
          ]}
        />
      </Section>

      <Section
        icon={<ShieldIcon className="h-5 w-5" />}
        title={t('admin.users.detail.overview.restrictionsAndSupport')}
      >
        <div className="flex flex-col gap-3">
          <RestrictionsField
            user={user}
            canEdit={canEditRestrictions}
            disabled={actionLoading}
            onSave={onUpdateRestrictions}
            hasRestrictions={hasRestrictions}
          />
          <Facts
            rows={[
              {
                label: t('admin.users.detail.overview.tickets'),
                value: (
                  <span className="inline-flex items-center gap-2">
                    {ticketsCount ?? '—'}
                    <TabLink onClick={() => onGoTo('activity', 'tickets')}>
                      {t('admin.users.detail.overview.open')}
                    </TabLink>
                  </span>
                ),
              },
              {
                label: t('admin.users.detail.overview.gifts'),
                value: (
                  <span className="inline-flex items-center gap-2">
                    {giftsCount ?? '—'}
                    <TabLink onClick={() => onGoTo('activity', 'gifts')}>
                      {t('admin.users.detail.overview.open')}
                    </TabLink>
                  </span>
                ),
              },
              {
                label: t('admin.users.detail.overview.promocodesUsed'),
                value: String(user.used_promocodes),
              },
            ]}
          />
        </div>
      </Section>

      <Section
        className="lg:col-span-2"
        icon={<ClockIcon className="h-5 w-5" />}
        title={t('admin.users.detail.overview.recent')}
        action={
          <TabLink onClick={() => onGoTo('activity')}>
            {t('admin.users.detail.overview.allActivity')}
          </TabLink>
        }
      >
        {recentActivity && recentActivity.length > 0 ? (
          <ul className="m-0 list-none divide-y divide-dark-800 p-0">
            {recentActivity.map((item, index) => {
              const { typeLabel, title } = describeItem(item, t);
              const amount = amountLabel(item, formatWithCurrency);
              return (
                <li
                  key={`${item.timestamp}-${index}`}
                  className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 py-2 text-sm"
                >
                  <span className="whitespace-nowrap font-mono text-xs text-dark-500">
                    {formatDate(item.timestamp)}
                  </span>
                  <span className="min-w-0 text-dark-200">
                    <span className="block truncate">{title ?? typeLabel}</span>
                    {title && (
                      <span className="block truncate text-xs text-dark-500">{typeLabel}</span>
                    )}
                  </span>
                  {amount && (
                    <span
                      className={cn(
                        'whitespace-nowrap font-mono text-xs tabular-nums',
                        amount.expense ? 'text-error-400' : 'text-success-400',
                      )}
                    >
                      {amount.text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-dark-500">{t('admin.users.detail.overview.noActivity')}</p>
        )}
      </Section>
    </div>
  );
}

function amountLabel(
  item: UserActivityItem,
  format: (rub: number) => string,
): { text: string; expense: boolean } | null {
  if (item.amount_kopeks == null || item.amount_kopeks === 0) return null;
  const rubles = Math.abs(item.amount_kopeks) / 100;
  const expense =
    item.type === 'withdrawal' ||
    (item.type === 'transaction' && item.subtype != null && EXPENSE_SUBTYPES.has(item.subtype)) ||
    item.amount_kopeks < 0;
  return { text: `${expense ? '−' : '+'}${format(rubles)}`, expense };
}

interface SectionProps {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

function Section({ icon, title, action, className, children }: SectionProps) {
  return (
    <Card size="md" className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-accent-400">{icon}</span>
        <h2 className="min-w-0 flex-1 text-lg font-semibold leading-tight text-dark-100">
          {title}
        </h2>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

function TabLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 text-xs font-semibold text-accent-400 transition-colors hover:text-accent-300"
    >
      {children} →
    </button>
  );
}

function Facts({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="whitespace-nowrap text-dark-500">{row.label}</dt>
          <dd className="m-0 min-w-0 text-dark-100">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface PromoGroupFieldProps {
  user: UserDetailResponse;
  promoGroups: PromoGroup[];
  canEdit: boolean;
  disabled: boolean;
  onChange: (groupId: number | null) => Promise<void>;
}

function PromoGroupField({ user, promoGroups, canEdit, disabled, onChange }: PromoGroupFieldProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.promo_group ? String(user.promo_group.id) : '');

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        {user.promo_group?.name ?? (
          <span className="text-dark-500">{t('admin.users.detail.overview.noPromoGroup')}</span>
        )}
        {canEdit && (
          <TabLink
            onClick={() => {
              setValue(user.promo_group ? String(user.promo_group.id) : '');
              setEditing(true);
            }}
          >
            {t('admin.users.detail.overview.change')}
          </TabLink>
        )}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="overview-promo-group" className="sr-only">
        {t('admin.users.detail.overview.promoGroup')}
      </label>
      <DropdownSelect
        id="overview-promo-group"
        value={value}
        onChange={setValue}
        disabled={disabled}
        className="min-w-[180px]"
        options={[
          { value: '', label: t('admin.users.detail.overview.noPromoGroup') },
          ...promoGroups.map((group) => ({ value: String(group.id), label: group.name })),
        ]}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          await onChange(value ? Number(value) : null);
          setEditing(false);
        }}
        className="btn-primary px-3 py-2 text-sm"
      >
        {t('common.save')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(false)}
        className="btn-ghost px-3 py-2 text-sm"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
}

interface RestrictionsFieldProps {
  user: UserDetailResponse;
  canEdit: boolean;
  disabled: boolean;
  hasRestrictions: boolean;
  onSave: (data: UpdateRestrictionsRequest) => Promise<void>;
}

function RestrictionsField({
  user,
  canEdit,
  disabled,
  hasRestrictions,
  onSave,
}: RestrictionsFieldProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [topup, setTopup] = useState(user.restriction_topup);
  const [subscription, setSubscription] = useState(user.restriction_subscription);
  const [reason, setReason] = useState(user.restriction_reason ?? '');

  if (!editing) {
    return (
      <div
        className={cn(
          'flex flex-col gap-1 rounded-xl px-3 py-2.5 text-sm',
          hasRestrictions ? 'bg-error-500/10 text-error-300' : 'bg-dark-800/60 text-dark-300',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">
            {t('admin.users.detail.overview.restrictions')}:{' '}
            {hasRestrictions
              ? [
                  user.restriction_topup && t('admin.users.detail.overview.restrictTopup'),
                  user.restriction_subscription &&
                    t('admin.users.detail.overview.restrictSubscription'),
                ]
                  .filter(Boolean)
                  .join(', ')
              : t('admin.users.detail.overview.noRestrictions')}
          </span>
          {canEdit && (
            <TabLink
              onClick={() => {
                setTopup(user.restriction_topup);
                setSubscription(user.restriction_subscription);
                setReason(user.restriction_reason ?? '');
                setEditing(true);
              }}
            >
              {t('admin.users.detail.overview.configure')}
            </TabLink>
          )}
        </div>
        {hasRestrictions && user.restriction_reason && (
          <span className="text-xs text-dark-400">
            {t('admin.users.detail.restrictions.reason')}: {user.restriction_reason}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dark-700 bg-dark-800/60 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-dark-200">{t('admin.users.detail.overview.restrictTopup')}</span>
        <Toggle
          checked={topup}
          onChange={() => setTopup((value) => !value)}
          disabled={disabled}
          aria-label={t('admin.users.detail.overview.restrictTopup')}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-dark-200">
          {t('admin.users.detail.overview.restrictSubscription')}
        </span>
        <Toggle
          checked={subscription}
          onChange={() => setSubscription((value) => !value)}
          disabled={disabled}
          aria-label={t('admin.users.detail.overview.restrictSubscription')}
        />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-dark-500">
          {t('admin.users.detail.overview.restrictionReason')}
        </span>
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={255}
          disabled={disabled}
          className="input py-2"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={async () => {
            await onSave({
              restriction_topup: topup,
              restriction_subscription: subscription,
              restriction_reason: reason.trim(),
            });
            setEditing(false);
          }}
          className="btn-primary px-3 py-2 text-sm"
        >
          {t('common.save')}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(false)}
          className="btn-ghost px-3 py-2 text-sm"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
