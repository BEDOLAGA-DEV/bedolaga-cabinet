import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  applyView,
  buildUsersQuery,
  classifySearch,
  hasActiveFilters,
  parseUsersListState,
  serializeUsersListState,
  sortDirection,
  withSort,
} from './usersListState';

/**
 * Состояние списка пользователей живёт в адресе: обновление страницы, «Назад»
 * из карточки и ссылка коллеге должны открывать ту же выборку. Одно поле
 * поиска само решает, что ввели — ID, @username, email или имя.
 */

describe('classifySearch', () => {
  it('цифры — Telegram ID через search', () => {
    expect(classifySearch(' 453205530 ')).toEqual({ search: '453205530' });
  });
  it('@username — search без собаки', () => {
    expect(classifySearch('@c0mrade_ton')).toEqual({ search: 'c0mrade_ton' });
  });
  it('одна собака без имени — ничего', () => {
    expect(classifySearch('@')).toEqual({});
  });
  it('email — параметр email', () => {
    expect(classifySearch('egor@example.com')).toEqual({ email: 'egor@example.com' });
  });
  it('имя — search', () => {
    expect(classifySearch('Марина')).toEqual({ search: 'Марина' });
  });
  it('пусто — ничего', () => {
    expect(classifySearch('   ')).toEqual({});
  });
});

describe('URL round-trip', () => {
  it('дефолт даёт пустой адрес', () => {
    expect(serializeUsersListState(DEFAULT_STATE).toString()).toBe('');
  });
  it('разбор и сериализация симметричны', () => {
    const params = new URLSearchParams(
      'q=%40olga&sub=expiring&tariff=3%2C1&sort=activity&view=expiring',
    );
    const state = parseUsersListState(params);
    expect(state).toMatchObject({
      q: '@olga',
      sub: 'expiring',
      sort: 'activity',
      tariff: '3,1',
      view: 'expiring',
    });
    expect(serializeUsersListState(state).toString()).toBe(params.toString());
  });
  it('один view в адресе разворачивается в пресет, явные параметры сильнее', () => {
    expect(parseUsersListState(new URLSearchParams('view=expiring'))).toMatchObject({
      view: 'expiring',
      sub: 'expiring',
      sort: 'expires',
    });
    expect(parseUsersListState(new URLSearchParams('view=expiring&sort=balance')).sort).toBe(
      'balance',
    );
  });
  it('мусор в адресе падает в дефолт', () => {
    expect(parseUsersListState(new URLSearchParams('sub=hacker&sort=nope&view=x'))).toEqual(
      DEFAULT_STATE,
    );
  });
});

describe('applyView', () => {
  it('сегмент «истекают» ставит подписку и сортировку', () => {
    expect(applyView(DEFAULT_STATE, 'expiring')).toMatchObject({
      view: 'expiring',
      sub: 'expiring',
      sort: 'expires',
    });
  });
  it('сегмент «в грейсе» — только открытый временный доступ, с ближайших к концу', () => {
    const state = applyView(DEFAULT_STATE, 'grace');
    expect(state).toMatchObject({ view: 'grace', sort: 'grace', sub: '' });
    expect(buildUsersQuery(state)).toMatchObject({ in_grace: true, sort_by: 'grace_until' });
    expect(buildUsersQuery(DEFAULT_STATE).in_grace).toBeUndefined();
    expect(parseUsersListState(new URLSearchParams('view=grace')).view).toBe('grace');
  });
  it('сегмент «все» сбрасывает фильтры, но не поиск', () => {
    const state = applyView(
      { ...DEFAULT_STATE, q: 'x', status: 'blocked', view: 'blocked' },
      'all',
    );
    expect(state).toEqual({ ...DEFAULT_STATE, q: 'x' });
  });
});

describe('buildUsersQuery', () => {
  it('переводит состояние в параметры ручки', () => {
    expect(
      buildUsersQuery({
        ...DEFAULT_STATE,
        q: 'a@b.cc',
        status: 'active',
        sub: 'expired',
        tariff: '3',
        sort: 'balance',
      }),
    ).toEqual({
      email: 'a@b.cc',
      status: 'active',
      subscription_status: 'expired',
      tariff_id: '3',
      sort_by: 'balance',
    });
  });
  it('«истекают» — серверный фильтр expires_within_days=7', () => {
    expect(buildUsersQuery(applyView(DEFAULT_STATE, 'expiring'))).toMatchObject({
      subscription_status: 'active',
      expires_within_days: 7,
      sort_by: 'subscription_end_date',
    });
  });
  it('«без подписки» и «онлайн» уходят своими параметрами', () => {
    expect(buildUsersQuery({ ...DEFAULT_STATE, sub: 'none' })).toMatchObject({
      has_subscription: false,
    });
    expect(buildUsersQuery(applyView(DEFAULT_STATE, 'online'))).toMatchObject({
      online: true,
      sort_by: 'last_activity',
    });
    expect(buildUsersQuery(applyView(DEFAULT_STATE, 'nopay'))).toMatchObject({
      purchase_count: 0,
    });
  });
  it('«трафик на исходе» — от 80 % лимита, а не только исчерпанные', () => {
    const query = buildUsersQuery(applyView(DEFAULT_STATE, 'traffic'));
    expect(query.traffic_used_percent_min).toBe(80);
    expect(query.subscription_status).toBeUndefined();
    expect(query.sort_by).toBe('traffic');
  });
  it('hasActiveFilters не считает сортировку', () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, sort: 'balance' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_STATE, status: 'blocked' })).toBe(true);
    expect(hasActiveFilters(applyView(DEFAULT_STATE, 'online'))).toBe(true);
  });
});

describe('направление сортировки', () => {
  it('без выбора — привычное для ключа: истечение с ближайших, остальное с больших и новых', () => {
    expect(sortDirection(DEFAULT_STATE)).toBe('desc');
    expect(sortDirection({ ...DEFAULT_STATE, sort: 'expires' })).toBe('asc');
    expect(buildUsersQuery(DEFAULT_STATE).sort_order).toBeUndefined();
  });
  it('выбранное направление уходит в ручку и живёт в адресе', () => {
    const state = parseUsersListState(new URLSearchParams('sort=created&dir=asc'));
    expect(sortDirection(state)).toBe('asc');
    expect(buildUsersQuery(state)).toMatchObject({ sort_by: 'created_at', sort_order: 'asc' });
    expect(serializeUsersListState(state).toString()).toBe('dir=asc');
  });
  it('привычное направление в адрес не пишется', () => {
    const state = withSort(DEFAULT_STATE, 'created', 'desc');
    expect(state.dir).toBe('');
    expect(serializeUsersListState(state).toString()).toBe('');
    expect(withSort(DEFAULT_STATE, 'expires', 'desc').dir).toBe('desc');
  });
  it('смена ключа возвращает его привычное направление', () => {
    const reversed = withSort(DEFAULT_STATE, 'created', 'asc');
    expect(withSort(reversed, 'balance').dir).toBe('');
    expect(withSort(reversed, 'created').dir).toBe('asc');
  });
  it('«грейс кончается» — свой ключ ручки, с ближайших, как истечение', () => {
    const state = parseUsersListState(new URLSearchParams('sort=grace'));
    expect(state.sort).toBe('grace');
    expect(sortDirection(state)).toBe('asc');
    expect(buildUsersQuery(state)).toMatchObject({ sort_by: 'grace_until' });
    expect(buildUsersQuery(state).sort_order).toBeUndefined();
    expect(withSort(DEFAULT_STATE, 'grace', 'desc').dir).toBe('desc');
  });
  it('мусорное направление и сегмент сбрасывают его', () => {
    expect(parseUsersListState(new URLSearchParams('dir=up')).dir).toBe('');
    expect(applyView({ ...DEFAULT_STATE, dir: 'asc' }, 'online').dir).toBe('');
  });
});
