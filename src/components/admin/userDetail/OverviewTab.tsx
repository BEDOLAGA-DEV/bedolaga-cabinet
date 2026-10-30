import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { AdminTicket } from '@/api/admin';
import type {
  AdminUserGiftsResponse,
  UpdateRestrictionsRequest,
  UserActivityItem,
  UserDetailResponse,
  UserPanelInfo,
} from '@/api/adminUsers';
import type { PromoGroup } from '@/api/promocodes';
import { backTo } from '@/components/admin/AdminBackButton';
import { dayTimeLabel, relativeLabel } from '@/components/admin/users';
import { CampaignIcon, ClockIcon, GlobeIcon, ShieldIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/format';
import { formatGb } from '@/utils/formatNumber';
import { isConnectedNow, relativeTimeParts } from '@/utils/relativeTime';
import { ActivityRows } from './ActivityRows';
import { type DeviceRow, deviceLongName } from './DevicesCard';
import { PromoGroupEditor, RestrictionsEditor } from './OverviewEditors';
import { KeyValues, LinkAction, Section } from './sectionParts';

export type DetailTab =
  | 'overview'
  | 'subscription'
  | 'balance'
  | 'referrals'
  | 'activity'
  | 'abuse';

export interface OverviewTabProps {
  user: UserDetailResponse;
  panelInfo: UserPanelInfo | null;
  devices: DeviceRow[] | null;
  promoGroups: PromoGroup[];
  tickets: AdminTicket[] | null;
  gifts: AdminUserGiftsResponse | null;
  recentActivity: UserActivityItem[] | null;
  can: { promoGroup: boolean; restrictions: boolean };
  busy: boolean;
  onChangePromoGroup: (groupId: number | null) => Promise<boolean>;
  onUpdateRestrictions: (request: UpdateRestrictionsRequest) => Promise<boolean>;
  onGoTo: (tab: DetailTab, view?: string) => void;
}

const BYTES_IN_GB = 1024 ** 3;
type Editor = 'promo' | 'restrictions';

/**
 * «Обзор» — первый экран карточки: подключение, откуда человек пришёл, ограничения с
 * обращениями и последние события. Всё, что поддержке нужно в первые десять секунд,
 * без прокрутки на десктопе.
 */
export function OverviewTab(props: OverviewTabProps) {
  const { t } = useTranslation();
  const { panelInfo, devices, onGoTo } = props;
  const [editor, setEditor] = useState<Editor | null>(null);
  const ns = 'admin.users.detail.overview';

  // Слева — факты о человеке, справа — лента последних событий. Подписки отдельной
  // карточкой здесь нет: срок, трафик и устройства в плитках над вкладками, а кнопки
  // управления — во вкладке «Подписка» и «Продлить» в шапке. Повторять их тут незачем.
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Section icon={<GlobeIcon className="h-5 w-5" />} title={t(`${ns}.connection`)}>
        {panelInfo?.found ? (
          <ConnectionFacts panelInfo={panelInfo} devices={devices} />
        ) : (
          <p className="text-sm text-dark-500">{t(`${ns}.noPanelData`)}</p>
        )}
      </Section>

      <Section
        className="lg:col-start-1"
        icon={<CampaignIcon className="h-5 w-5" />}
        title={t(`${ns}.origin`)}
      >
        <OriginFacts {...props} editor={editor} onEditor={setEditor} />
      </Section>

      <Section
        className="lg:col-start-1"
        icon={<ShieldIcon className="h-5 w-5" />}
        title={t(`${ns}.restrictionsAndSupport`)}
      >
        <SupportFacts {...props} editor={editor} onEditor={setEditor} />
      </Section>

      <Section
        className="lg:col-start-2 lg:row-span-3 lg:row-start-1"
        icon={<ClockIcon className="h-5 w-5" />}
        title={t(`${ns}.recent`)}
        action={
          <LinkAction arrow short={t(`${ns}.all`)} onClick={() => onGoTo('activity')}>
            {t(`${ns}.allActivity`)}
          </LinkAction>
        }
      >
        {props.recentActivity && props.recentActivity.length > 0 ? (
          <ActivityRows items={props.recentActivity} compact />
        ) : (
          <p className="text-sm text-dark-500">{t(`${ns}.noActivity`)}</p>
        )}
      </Section>
    </div>
  );
}

function ConnectionFacts({
  panelInfo,
  devices,
}: {
  panelInfo: UserPanelInfo;
  devices: DeviceRow[] | null;
}) {
  const { t } = useTranslation();
  const ns = 'admin.users.detail.overview';
  // «Сейчас» — как точка в панели: подключён, если отметка не старше минуты; иначе — когда был.
  const online = isConnectedNow(panelInfo.online_at);
  const lastSeen = relativeTimeParts(panelInfo.online_at);

  return (
    <KeyValues
      rows={[
        {
          key: 'now',
          label: t(`${ns}.now`),
          value: (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  online
                    ? 'bg-success-400 shadow-[0_0_6px_rgba(var(--color-success-400),0.6)]'
                    : 'bg-dark-600',
                )}
              />
              <span className={cn(online && 'text-success-400')}>
                {online ? t('common.relative.online') : relativeLabel(lastSeen, t)}
              </span>
              {panelInfo.last_connected_node_name && (
                <span className="text-dark-400">· {panelInfo.last_connected_node_name}</span>
              )}
            </span>
          ),
        },
        {
          key: 'first',
          label: t(`${ns}.firstConnection`),
          value: panelInfo.first_connected_at ? formatShortDate(panelInfo.first_connected_at) : '—',
        },
        {
          key: 'devices',
          label: t(`${ns}.devices`),
          value:
            devices && devices.length > 0
              ? devices.map(deviceLongName).join(', ')
              : t(`${ns}.noDevices`),
        },
        {
          key: 'lifetime',
          label: t(`${ns}.lifetimeTraffic`),
          value: `${formatGb(panelInfo.lifetime_used_traffic_bytes / BYTES_IN_GB)} ${t('common.units.gb')}`,
        },
      ]}
    />
  );
}

interface EditorProps {
  editor: Editor | null;
  onEditor: (editor: Editor | null) => void;
}

function OriginFacts({
  user,
  promoGroups,
  can,
  busy,
  onChangePromoGroup,
  onGoTo,
  editor,
  onEditor,
}: OverviewTabProps & EditorProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const ns = 'admin.users.detail.overview';
  const referrer = user.referral;

  return (
    <KeyValues
      rows={[
        {
          key: 'registered',
          label: t(`${ns}.registered`),
          value: formatShortDate(user.created_at),
        },
        { key: 'campaign', label: t(`${ns}.campaign`), value: user.campaign_name ?? '—' },
        {
          key: 'promo',
          label: t(`${ns}.promoGroup`),
          value:
            editor === 'promo' ? (
              <PromoGroupEditor
                user={user}
                promoGroups={promoGroups}
                busy={busy}
                onSave={onChangePromoGroup}
                onClose={() => onEditor(null)}
              />
            ) : (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                {user.promo_group?.name ?? (
                  <span className="text-dark-500">{t(`${ns}.noPromoGroup`)}</span>
                )}
                {can.promoGroup && (
                  <LinkAction onClick={() => onEditor('promo')}>{t(`${ns}.change`)}</LinkAction>
                )}
              </span>
            ),
        },
        {
          key: 'referrer',
          label: t(`${ns}.referrer`),
          value: referrer.referred_by_id ? (
            <Link
              to={`/admin/users/${referrer.referred_by_id}`}
              state={backTo(location).state}
              className="text-accent-400 hover:text-accent-300"
            >
              {referrer.referred_by_username
                ? `@${referrer.referred_by_username}`
                : `#${referrer.referred_by_id}`}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-x-2">
              <span className="text-dark-500">—</span>
              <LinkAction onClick={() => onGoTo('referrals')}>{t(`${ns}.assign`)}</LinkAction>
            </span>
          ),
        },
        {
          key: 'activity',
          label: t(`${ns}.lastActivity`),
          value: user.last_activity ? relativeLabel(relativeTimeParts(user.last_activity), t) : '—',
        },
        {
          key: 'login',
          label: t(`${ns}.cabinetLogin`),
          value: user.cabinet_last_login ? dayTimeLabel(user.cabinet_last_login, t) : '—',
        },
      ]}
    />
  );
}

function SupportFacts({
  user,
  tickets,
  gifts,
  can,
  busy,
  onUpdateRestrictions,
  onGoTo,
  editor,
  onEditor,
}: OverviewTabProps & EditorProps) {
  const { t } = useTranslation();
  const ns = 'admin.users.detail.overview';
  const restricted = [
    user.restriction_topup && t(`${ns}.restrictTopup`),
    user.restriction_subscription && t(`${ns}.restrictSubscription`),
  ].filter(Boolean) as string[];
  const openTickets = tickets?.filter((ticket) => ticket.status !== 'closed').length ?? 0;
  const closedTickets = (tickets?.length ?? 0) - openTickets;

  const countsOrNone = (parts: (string | false)[]) => {
    const shown = parts.filter(Boolean);
    return shown.length > 0 ? shown.join(', ') : t(`${ns}.none`);
  };

  return (
    <div className="flex flex-col gap-3">
      <KeyValues
        rows={[
          {
            key: 'restrictions',
            label: t(`${ns}.restrictions`),
            value: (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <span className={cn(restricted.length > 0 && 'text-error-400')}>
                  {restricted.length > 0 ? restricted.join(', ') : t(`${ns}.noRestrictions`)}
                </span>
                {can.restrictions && editor !== 'restrictions' && (
                  <LinkAction onClick={() => onEditor('restrictions')}>
                    {t(`${ns}.configure`)}
                  </LinkAction>
                )}
              </span>
            ),
          },
          ...(restricted.length > 0 && user.restriction_reason
            ? [
                {
                  key: 'reason',
                  label: t('admin.users.detail.restrictions.reason'),
                  value: user.restriction_reason,
                },
              ]
            : []),
          {
            key: 'tickets',
            label: t(`${ns}.tickets`),
            value: (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                {tickets === null
                  ? '—'
                  : countsOrNone([
                      openTickets > 0 && t(`${ns}.ticketsOpen`, { count: openTickets }),
                      closedTickets > 0 && t(`${ns}.ticketsClosed`, { count: closedTickets }),
                    ])}
                {tickets && tickets.length > 0 && (
                  <LinkAction arrow onClick={() => onGoTo('activity', 'tickets')}>
                    {t(`${ns}.open`)}
                  </LinkAction>
                )}
              </span>
            ),
          },
          {
            key: 'gifts',
            label: t(`${ns}.gifts`),
            value: (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                {gifts === null
                  ? '—'
                  : countsOrNone([
                      gifts.sent_total > 0 && t(`${ns}.giftsSent`, { count: gifts.sent_total }),
                      gifts.received_total > 0 &&
                        t(`${ns}.giftsReceived`, { count: gifts.received_total }),
                    ])}
                {gifts && gifts.sent_total + gifts.received_total > 0 && (
                  <LinkAction arrow onClick={() => onGoTo('activity', 'gifts')}>
                    {t(`${ns}.list`)}
                  </LinkAction>
                )}
              </span>
            ),
          },
          {
            key: 'promocodes',
            label: t(`${ns}.promocodes`),
            value:
              user.used_promocodes > 0
                ? t(`${ns}.promocodesUsed`, { count: user.used_promocodes })
                : t(`${ns}.none`),
          },
        ]}
      />
      {editor === 'restrictions' && (
        <RestrictionsEditor
          user={user}
          busy={busy}
          onSave={onUpdateRestrictions}
          onClose={() => onEditor(null)}
        />
      )}
    </div>
  );
}
