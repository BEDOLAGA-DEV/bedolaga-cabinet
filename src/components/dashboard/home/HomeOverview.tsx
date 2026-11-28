import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  CardIcon,
  ChevronRightIcon,
  DevicesIcon,
  PlusIcon,
  TrafficIcon,
  UsersIcon,
} from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/useCurrency';
import { useHaptic } from '@/platform';
import type { Subscription, TrialInfo } from '@/types';
import i18n from '@/i18n';
import { formatTraffic } from '@/utils/formatTraffic';
import { uiLocale } from '@/utils/uiLocale';
import {
  connectPath,
  homeState,
  subscriptionPagePath,
  tariffPath,
  type HomeAction,
  type HomeKind,
  type HomeTone,
} from './homeState';

export interface HomeOverviewProps {
  loading: boolean;
  subscription: Subscription | null;
  devicesTotal: number;
  /** Свежий трафик после refresh; иначе берём из подписки. */
  traffic?: { used_gb: number; percent: number; unlimited: boolean } | null;
  balanceRubles: number;
  referral: { enabled: boolean; count: number; earningsRubles: number };
  /** Бесплатный пробный период, который можно включить прямо с главной. */
  freeTrial: TrialInfo | null;
  onActivateTrial: () => void;
  trialPending: boolean;
  trialError: string | null;
  /** Промо-предложения: под плиткой статуса, над плитками — на телефоне иначе их не видно. */
  promo?: ReactNode;
}

/**
 * Классы палитр строками целиком — Tailwind видит только литералы.
 * Палитры берутся из админки (Тема): акцент, warning, error. В светлой теме
 * 300/400 ремапятся на тёмные шейды в globals.css, контраст держится сам.
 */
const TONE: Record<
  HomeTone,
  { hero: string; label: string; dot: string; primary: string; secondary: string; bar: string }
> = {
  accent: {
    hero: 'border-accent-500/30 bg-accent-500/[0.08]',
    label: 'text-accent-400',
    dot: 'bg-accent-500',
    primary: 'bg-accent-500 text-on-accent hover:bg-accent-600',
    secondary: 'bg-accent-500/15 text-accent-400 hover:bg-accent-500/25',
    bar: 'bg-accent-500',
  },
  warning: {
    hero: 'border-warning-500/40 bg-warning-500/[0.08]',
    label: 'text-warning-400',
    dot: 'bg-warning-500',
    primary: 'bg-warning-500 text-on-warning hover:bg-warning-600',
    secondary: 'bg-warning-500/15 text-warning-400 hover:bg-warning-500/25',
    bar: 'bg-warning-500',
  },
  error: {
    hero: 'border-error-500/40 bg-error-500/[0.08]',
    label: 'text-error-400',
    dot: 'bg-error-500',
    primary: 'bg-error-500 text-on-error hover:bg-error-600',
    secondary: 'bg-error-500/15 text-error-400 hover:bg-error-500/25',
    bar: 'bg-error-500',
  },
};

/** Активная подписка — «зелёная точка»; остальное по цвету состояния. */
const STATUS_DOT: Partial<Record<HomeKind, string>> = { active: 'bg-success-500' };
const STATUS_TEXT: Partial<Record<HomeKind, string>> = { active: 'text-success-400' };

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(uiLocale(), {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

/**
 * Трафик для плитки: «41 ГБ», а не «41,0 ГБ» — в узкой плитке телефона дробная
 * часть съедает строку. Меньше 10 ГБ десятые ещё значимы; терабайты — как везде.
 */
function compactTraffic(gb: number): string {
  if (gb >= 1000 || gb < 1) return formatTraffic(gb);
  const n = new Intl.NumberFormat(uiLocale(), { maximumFractionDigits: gb < 10 ? 1 : 0 }).format(
    gb,
  );
  return `${n} ${i18n.t('common.units.gb', 'GB')}`;
}

// whitespace-nowrap + flex-wrap у ряда: не влезли две кнопки — вторая уходит
// на свою строку целиком, подпись не ломается посередине.
const BUTTON_BASE =
  'inline-flex min-h-12 grow items-center justify-center whitespace-nowrap rounded-2xl px-5 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

export function HomeOverview(props: HomeOverviewProps) {
  const { t } = useTranslation();
  const haptic = useHaptic();
  const { formatAmount, currencySymbol } = useCurrency();
  const { subscription: sub, devicesTotal, referral } = props;

  if (props.loading) return <HomeSkeleton />;

  const deviceLimit = sub?.device_limit ?? 0;
  const atDeviceLimit = deviceLimit > 0 && devicesTotal >= deviceLimit;
  const state = homeState(sub, { trialAvailable: !!props.freeTrial, atDeviceLimit });
  const tone = TONE[state.tone];
  const money = (rub: number) => `${formatAmount(rub)} ${currencySymbol}`;

  const statusText = t(`home.status.${state.kind}`);
  const tariffName = sub && !sub.is_trial ? sub.tariff_name : null;

  let big: string;
  let sub1: string;
  if (!sub) {
    big = props.freeTrial
      ? t('home.big.trialDays', { count: props.freeTrial.duration_days })
      : t('home.big.noSub');
    sub1 = props.freeTrial ? t('home.sub.trialOffer') : t('home.sub.noSub');
  } else if (state.kind === 'expired') {
    big = t('home.big.paused');
    sub1 = [
      t('home.sub.endedOn', { date: formatDate(sub.end_date) }),
      devicesTotal > 0 ? t('home.sub.devicesKept', { count: devicesTotal }) : '',
    ]
      .filter(Boolean)
      .join(' ');
  } else if (state.kind === 'limited') {
    big = t('home.big.trafficOut');
    sub1 = t('home.sub.limited', { date: formatDate(sub.end_date) });
  } else {
    big =
      sub.days_left >= 1
        ? t('home.big.days', { count: sub.days_left })
        : t('home.big.hours', { count: Math.max(1, sub.hours_left) });
    sub1 = [
      t('home.sub.until', { date: formatDate(sub.end_date) }),
      !sub.is_trial && sub.autopay_enabled ? t('home.sub.autopayOn') : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  const renderAction = (a: HomeAction, kind: 'primary' | 'secondary') => {
    const cls = `${BUTTON_BASE} ${kind === 'primary' ? `${tone.primary} flex-1 lg:flex-none lg:min-w-[220px]` : tone.secondary}`;
    const label =
      a.action === 'activateTrial' && props.trialPending
        ? t('home.action.activating')
        : t(`home.action.${a.label}`);
    if (a.action === 'activateTrial') {
      return (
        <button
          key={a.label}
          type="button"
          className={cls}
          disabled={props.trialPending}
          aria-busy={props.trialPending}
          onClick={() => {
            haptic.impact('medium');
            props.onActivateTrial();
          }}
        >
          {label}
        </button>
      );
    }
    return (
      <Link
        key={a.label}
        to={a.to ?? '/'}
        className={cls}
        onClick={() => haptic.impact(kind === 'primary' ? 'medium' : 'light')}
      >
        {label}
      </Link>
    );
  };

  // Плитки по состоянию: у новичка и закончившейся подписки нечего мерить.
  const showUsage = !!sub && state.kind !== 'expired';
  const unlimitedDevices = deviceLimit === 0;
  const trafficUnlimited = props.traffic?.unlimited ?? (sub ? sub.traffic_limit_gb === 0 : false);
  const trafficUsed = props.traffic?.used_gb ?? sub?.traffic_used_gb ?? 0;
  const trafficPercent = Math.min(
    100,
    Math.max(0, props.traffic?.percent ?? sub?.traffic_used_percent ?? 0),
  );
  const trafficHot = !trafficUnlimited && (trafficPercent >= 80 || state.kind === 'limited');

  let stagger = 0;
  const next = () => ({ '--stagger': stagger++ }) as CSSProperties;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <section
        aria-label={statusText}
        className={`bento-card col-span-2 border lg:col-span-4 ${tone.hero}`}
        style={next()}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${STATUS_DOT[state.kind] ?? tone.dot}`}
              />
              <span className={STATUS_TEXT[state.kind] ?? tone.label}>{statusText}</span>
              {tariffName && <span className="truncate text-dark-400">· {tariffName}</span>}
            </div>
            <div className="mt-3 text-[40px] font-extrabold leading-none tracking-[-0.03em] text-dark-50 tabular-nums sm:text-5xl">
              {big}
            </div>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-snug text-dark-300">{sub1}</p>
          </div>
          <div
            className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end"
            data-onboarding={sub ? 'connect-devices' : undefined}
          >
            {renderAction(state.primary, 'primary')}
            {state.secondary && renderAction(state.secondary, 'secondary')}
          </div>
        </div>
        {props.trialError && (
          <p role="alert" className="mt-3 text-sm text-error-400">
            {props.trialError}
          </p>
        )}
      </section>

      {props.promo && <div className="col-span-2 empty:hidden lg:col-span-4">{props.promo}</div>}

      {showUsage && sub && (
        <div className="relative" style={next()}>
          <Tile
            to={subscriptionPagePath(sub.id, 'devices')}
            label={t('home.tile.devices')}
            icon={<DevicesIcon />}
            value={
              unlimitedDevices
                ? String(devicesTotal)
                : t('home.tile.devicesOf', { used: devicesTotal, limit: deviceLimit })
            }
            note={unlimitedDevices ? t('home.tile.devicesUnlimited') : undefined}
          >
            {!unlimitedDevices && deviceLimit <= 10 && (
              <span className="mt-auto flex gap-1 pt-3" aria-hidden="true">
                {Array.from({ length: deviceLimit }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < devicesTotal ? tone.bar : 'bg-dark-700/60'}`}
                  />
                ))}
              </span>
            )}
          </Tile>
          {!atDeviceLimit && sub.subscription_url && (
            <Link
              to={connectPath(sub.id)}
              aria-label={t('home.tile.addDevice')}
              title={t('home.tile.addDevice')}
              onClick={() => haptic.impact('light')}
              className="absolute right-[var(--bento-padding)] top-[calc(var(--bento-padding)+42px)] flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400 transition-colors hover:bg-accent-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60"
            >
              <PlusIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
      )}

      {showUsage && sub && (
        <div style={next()}>
          <Tile
            to={tariffPath(sub)}
            label={t('home.tile.traffic')}
            icon={<TrafficIcon />}
            value={compactTraffic(trafficUsed)}
            note={
              trafficUnlimited
                ? t('home.tile.trafficUnlimited')
                : t('home.tile.trafficLimit', { limit: compactTraffic(sub.traffic_limit_gb) })
            }
            hot={trafficHot}
          >
            {!trafficUnlimited && (
              <span
                className="mt-auto block h-1.5 overflow-hidden rounded-full bg-dark-700/60"
                aria-hidden="true"
              >
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ease-out ${trafficHot ? TONE.warning.bar : tone.bar}`}
                  style={{ width: `${trafficPercent}%` }}
                />
              </span>
            )}
          </Tile>
        </div>
      )}

      {!sub && (
        <div className="bento-card col-span-2" style={next()}>
          <h3 className="text-[15px] font-semibold text-dark-50">{t('home.steps.title')}</h3>
          <ol className="mt-4 grid grid-cols-3 gap-3">
            {[
              props.freeTrial ? 'home.steps.trial' : 'home.steps.plan',
              'home.steps.app',
              'home.steps.connect',
            ].map((key, i) => (
              <li key={key} className="flex flex-col gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-[13px] font-bold text-accent-400">
                  {i + 1}
                </span>
                <span className="text-[13px] leading-snug text-dark-300">{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className={referral.enabled ? '' : 'col-span-2'} style={next()}>
        <Tile
          to="/balance"
          label={t('home.tile.balance')}
          icon={<CardIcon />}
          iconTone="accent"
          valueClassName="text-accent-400"
          value={money(props.balanceRubles)}
          link={t('home.tile.topUp')}
        />
      </div>

      {referral.enabled && (
        <div style={next()}>
          <Tile
            to="/referral"
            label={t('home.tile.friends')}
            icon={<UsersIcon />}
            value={String(referral.count)}
            note={t('home.tile.earned', { amount: money(referral.earningsRubles) })}
            link={t('home.tile.invite')}
          />
        </div>
      )}
    </div>
  );
}

/** Плашка иконки — как у StatCard в прежних плитках главной. */
const ICON_CHIP = {
  neutral: 'bg-dark-700/60 text-dark-300',
  accent: 'bg-accent-500/15 text-accent-400',
  warning: 'bg-warning-500/15 text-warning-400',
} as const;

function Tile({
  to,
  label,
  value,
  note,
  link,
  hot,
  icon,
  iconTone = 'neutral',
  valueClassName = 'text-dark-50',
  children,
}: {
  to: string;
  label: string;
  value: string;
  note?: string;
  link?: string;
  hot?: boolean;
  icon: ReactNode;
  iconTone?: keyof typeof ICON_CHIP;
  valueClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`bento-card-hover group flex h-full min-h-[136px] flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 ${
        hot ? '!border-warning-500/40' : ''
      }`}
    >
      <span className="mb-2 flex items-center gap-2.5 text-[13px] font-medium text-dark-400">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5 ${ICON_CHIP[hot ? 'warning' : iconTone]}`}
        >
          {icon}
        </span>
        {label}
        <ChevronRightIcon className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </span>
      <span
        className={`text-[22px] font-extrabold leading-tight tracking-[-0.02em] tabular-nums ${valueClassName}`}
      >
        {value}
      </span>
      {note && <span className="text-[13px] text-dark-400">{note}</span>}
      {link && (
        <span className="mt-auto pt-2 text-[13px] font-semibold text-accent-400">{link}</span>
      )}
      {children}
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <SkeletonGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <div className="bento-card col-span-2 lg:col-span-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-10 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
        <Skeleton className="mt-5 h-12 w-full rounded-2xl lg:w-56" />
      </div>
      <Skeleton variant="card" count={4} className="h-[128px]" />
    </SkeletonGroup>
  );
}

export default HomeOverview;
