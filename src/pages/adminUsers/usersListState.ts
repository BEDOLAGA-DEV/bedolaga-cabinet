import type { UsersListParams } from '@/api/adminUsers';

/**
 * Состояние списка пользователей админки.
 *
 * Живёт в адресе страницы (`?q=&status=&sub=…`), поэтому переживает обновление,
 * «Назад» из карточки и пересылку ссылки коллеге. Здесь только чистые функции:
 * разбор адреса, сериализация, сегменты и перевод в параметры ручки списка.
 */

export type StatusFilter = '' | 'active' | 'blocked' | 'deleted';
export type SubFilter = '' | 'active' | 'trial' | 'expiring' | 'expired' | 'limited' | 'none';
export type SortKey =
  | 'expires'
  | 'activity'
  | 'created'
  | 'balance'
  | 'spent'
  | 'traffic'
  | 'purchases';
export type ViewKey = 'all' | 'expiring' | 'traffic' | 'nopay' | 'online' | 'blocked';

export interface UsersListState {
  /** Строка поиска как её ввели — разбирается в `classifySearch`. */
  q: string;
  status: StatusFilter;
  sub: SubFilter;
  /** id тарифов через запятую — ровно так их принимает ручка. */
  tariff: string;
  group: string;
  campaign: string;
  sort: SortKey;
  /** Сегмент — готовый набор параметров, см. VIEW_PRESETS. */
  view: ViewKey;
}

export type UsersQuery = UsersListParams;

export const STATUS_FILTERS: readonly StatusFilter[] = ['', 'active', 'blocked', 'deleted'];
export const SUB_FILTERS: readonly SubFilter[] = [
  '',
  'active',
  'trial',
  'expiring',
  'expired',
  'limited',
  'none',
];
export const SORT_KEYS: readonly SortKey[] = [
  'expires',
  'activity',
  'created',
  'balance',
  'spent',
  'traffic',
  'purchases',
];
export const VIEW_KEYS: readonly ViewKey[] = [
  'all',
  'expiring',
  'traffic',
  'nopay',
  'online',
  'blocked',
];

export const DEFAULT_STATE: UsersListState = {
  q: '',
  status: '',
  sub: '',
  tariff: '',
  group: '',
  campaign: '',
  sort: 'created',
  view: 'all',
};

/** Окно «истекают скоро» и «был в сети» — те же числа, что в подписях сегментов. */
export const EXPIRING_DAYS = 7;
export const ONLINE_MINUTES = 5;

const SORT_TO_API: Record<SortKey, NonNullable<UsersQuery['sort_by']>> = {
  expires: 'subscription_end_date',
  activity: 'last_activity',
  created: 'created_at',
  balance: 'balance',
  spent: 'total_spent',
  traffic: 'traffic',
  purchases: 'purchase_count',
};

/** Сегмент — набор параметров поверх дефолта; `all` снимает всё, кроме строки поиска. */
const VIEW_PRESETS: Record<ViewKey, Partial<Omit<UsersListState, 'q' | 'view'>>> = {
  all: {},
  expiring: { sub: 'expiring', sort: 'expires' },
  traffic: { sub: 'limited', sort: 'traffic' },
  nopay: { sort: 'purchases' },
  online: { sort: 'activity' },
  blocked: { status: 'blocked' },
};

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Адрес с одним `view=` (ссылка из уведомления, закладка) разворачивается в пресет
 * сегмента; явные параметры в адресе сильнее пресета.
 */
export function parseUsersListState(params: URLSearchParams): UsersListState {
  const view = pick(params.get('view'), VIEW_KEYS, DEFAULT_STATE.view);
  const base = applyView(DEFAULT_STATE, view);
  return {
    q: params.get('q') ?? '',
    status: pick(params.get('status'), STATUS_FILTERS, base.status),
    sub: pick(params.get('sub'), SUB_FILTERS, base.sub),
    tariff: params.get('tariff') ?? '',
    group: params.get('group') ?? '',
    campaign: params.get('campaign') ?? '',
    sort: pick(params.get('sort'), SORT_KEYS, base.sort),
    view,
  };
}

/** Пустые и дефолтные значения в адрес не пишутся — чистый `/admin/users` остаётся чистым. */
export function serializeUsersListState(state: UsersListState): URLSearchParams {
  const out = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_STATE) as (keyof UsersListState)[]) {
    const value = state[key];
    if (value !== DEFAULT_STATE[key] && value !== '') out.set(key, value);
  }
  return out;
}

export function applyView(state: UsersListState, view: ViewKey): UsersListState {
  return { ...DEFAULT_STATE, q: state.q, ...VIEW_PRESETS[view], view };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Одно поле на всё: цифры и имена уходят в `search` (сервер сам сопоставит
 * Telegram ID, имя и username), `@name` — username без собаки, адрес с
 * собакой и точкой — в `email`.
 */
export function classifySearch(raw: string): Pick<UsersQuery, 'search' | 'email'> {
  const q = raw.trim();
  if (!q) return {};
  if (q.startsWith('@')) return q.length > 1 ? { search: q.slice(1) } : {};
  if (EMAIL_RE.test(q)) return { email: q };
  return { search: q };
}

/** Параметры ручки списка без `offset`/`limit` — их добавляет лента. */
export function buildUsersQuery(state: UsersListState): UsersQuery {
  const query: UsersQuery = { ...classifySearch(state.q), sort_by: SORT_TO_API[state.sort] };
  if (state.status) query.status = state.status;
  if (state.sub === 'expiring') {
    query.subscription_status = 'active';
    query.expires_within_days = EXPIRING_DAYS;
  } else if (state.sub === 'none') {
    query.has_subscription = false;
  } else if (state.sub) {
    query.subscription_status = state.sub;
  }
  if (state.tariff) query.tariff_id = state.tariff;
  if (state.group) query.promo_group_id = Number(state.group);
  if (state.campaign) query.campaign_id = Number(state.campaign);
  if (state.view === 'online') query.active_within_minutes = ONLINE_MINUTES;
  if (state.view === 'nopay') query.purchase_count = 0;
  return query;
}

/** Есть ли что сбрасывать: сортировка выборку не сужает и не считается. */
export function hasActiveFilters(state: UsersListState): boolean {
  return Boolean(
    state.q ||
      state.status ||
      state.sub ||
      state.tariff ||
      state.group ||
      state.campaign ||
      state.view !== 'all',
  );
}
