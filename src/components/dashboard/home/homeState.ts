import type { Subscription } from '@/types';
import { canOpenTariffSwitch, needsTariff, tariffSelectionPath } from '@/utils/legacySubscription';

/**
 * Состояние главной в одном месте: какая плитка статуса, каким цветом, куда
 * ведут кнопки. Компонент только рисует то, что решено здесь, — так каждое
 * состояние подписки проверяется тестом без рендера.
 */

/** Сколько дней до конца считаем «скоро закончится». */
export const EXPIRING_DAYS = 3;

export type HomeKind = 'none' | 'trial' | 'active' | 'expiring' | 'limited' | 'expired';

/** Цвет состояния — палитры из админки (Тема): акцент и цвета статусов. */
export type HomeTone = 'accent' | 'warning' | 'error';

export interface HomeAction {
  /** Ключ перевода подписи. */
  label: 'connect' | 'renew' | 'switchTariff' | 'autopay' | 'buyTariff' | 'plans' | 'tryFree';
  to?: string;
  /** Вместо перехода — действие на месте (активация пробного периода). */
  action?: 'activateTrial';
}

export interface HomeState {
  kind: HomeKind;
  tone: HomeTone;
  primary: HomeAction;
  secondary: HomeAction | null;
}

export const subscriptionPagePath = (id: number, section?: 'autopay' | 'devices') =>
  `/subscriptions/${id}${section ? `#${section}` : ''}`;

export const connectPath = (id: number) => `/connection?sub=${id}`;

/**
 * Продление. Повторяет PurchaseCTAButton: старая подписка без тарифа — витрина
 * для неё, пробная и закончившаяся — покупка, действующая — выбор периода.
 */
export function renewPath(sub: Subscription): string {
  if (needsTariff(sub)) return tariffSelectionPath(sub.id);
  if (sub.is_trial) return '/subscription/purchase';
  if (canOpenTariffSwitch(sub)) return `/subscriptions/${sub.id}/renew`;
  return '/subscription/purchase';
}

/** Плитка трафика ведёт на смену тарифа, а где сменить нельзя — на покупку. */
export function tariffPath(sub: Subscription): string {
  if (canOpenTariffSwitch(sub) || needsTariff(sub)) return tariffSelectionPath(sub.id);
  return '/subscription/purchase';
}

export function homeKind(sub: Subscription | null): HomeKind {
  if (!sub) return 'none';
  if (sub.is_expired || sub.status === 'disabled') return 'expired';
  if (sub.is_limited) return 'limited';
  if (sub.is_trial) return 'trial';
  if (sub.days_left <= EXPIRING_DAYS) return 'expiring';
  return 'active';
}

export function homeState(
  sub: Subscription | null,
  opts: { trialAvailable: boolean; atDeviceLimit: boolean },
): HomeState {
  const kind = homeKind(sub);

  if (!sub) {
    return opts.trialAvailable
      ? {
          kind,
          tone: 'accent',
          primary: { label: 'tryFree', action: 'activateTrial' },
          secondary: { label: 'plans', to: '/subscription/purchase' },
        }
      : {
          kind,
          tone: 'accent',
          primary: { label: 'plans', to: '/subscription/purchase' },
          secondary: null,
        };
  }

  // Подключение без свободного места бесполезно — ведём к списку устройств.
  const connect: HomeAction = opts.atDeviceLimit
    ? { label: 'connect', to: subscriptionPagePath(sub.id, 'devices') }
    : { label: 'connect', to: connectPath(sub.id) };
  const renew: HomeAction = { label: 'renew', to: renewPath(sub) };
  const switchTariff: HomeAction | null = canOpenTariffSwitch(sub)
    ? { label: 'switchTariff', to: tariffSelectionPath(sub.id) }
    : null;

  switch (kind) {
    case 'trial':
      return {
        kind,
        tone: 'accent',
        primary: connect,
        secondary: { label: 'buyTariff', to: '/subscription/purchase' },
      };
    case 'expiring':
      return {
        kind,
        tone: 'warning',
        primary: renew,
        // Автоплатёж выключен — предлагаем включить (подсветка блока на странице
        // подписки). Включён — продлится сам, полезнее «Сменить тариф».
        secondary: !sub.autopay_enabled
          ? { label: 'autopay', to: subscriptionPagePath(sub.id, 'autopay') }
          : switchTariff,
      };
    case 'limited':
      return {
        kind,
        tone: 'warning',
        primary: switchTariff ?? { label: 'buyTariff', to: tariffPath(sub) },
        secondary: null,
      };
    case 'expired':
      return {
        kind,
        tone: 'error',
        primary: renew,
        secondary: needsTariff(sub) ? null : { label: 'plans', to: '/subscription/purchase' },
      };
    default:
      return { kind, tone: 'accent', primary: connect, secondary: null };
  }
}
