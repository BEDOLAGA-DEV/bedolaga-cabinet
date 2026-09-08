import { describe, expect, it } from 'vitest';
import { isMobileNavScreen, mobileNavItems } from './mobileNavRoutes';

/**
 * Нижняя панель на телефоне живёт только на экранах, куда ведут её кнопки:
 * главная, подписка, баланс, поддержка и один слот под колесо или рефералку.
 * На вложенных страницах и в админке панель не показывается, а место под ней
 * не резервируется. Набор экранов и проверка «мы на таком экране» — в одном
 * месте, чтобы панель и оболочка не разошлись.
 */
describe('mobileNavItems', () => {
  it('без флагов — четыре базовых экрана', () => {
    expect(mobileNavItems({}).map((item) => item.path)).toEqual([
      '/',
      '/subscriptions',
      '/balance',
      '/support',
    ]);
  });

  it('колесо занимает слот перед поддержкой и вытесняет рефералку', () => {
    const paths = mobileNavItems({ wheelEnabled: true, referralEnabled: true }).map(
      (item) => item.path,
    );
    expect(paths).toEqual(['/', '/subscriptions', '/balance', '/wheel', '/support']);
  });

  it('рефералка получает слот, когда колесо выключено', () => {
    const paths = mobileNavItems({ referralEnabled: true }).map((item) => item.path);
    expect(paths).toEqual(['/', '/subscriptions', '/balance', '/referral', '/support']);
  });

  it('ключ пункта совпадает с ключом перевода nav.*', () => {
    expect(mobileNavItems({ wheelEnabled: true }).map((item) => item.key)).toEqual([
      'dashboard',
      'subscription',
      'balance',
      'wheel',
      'support',
    ]);
  });
});

describe('isMobileNavScreen', () => {
  const items = mobileNavItems({ wheelEnabled: true });

  it('главная и экраны кнопок — да', () => {
    for (const path of ['/', '/subscriptions', '/balance', '/wheel', '/support']) {
      expect(isMobileNavScreen(path, items), path).toBe(true);
    }
  });

  it('хвостовой слеш не мешает', () => {
    expect(isMobileNavScreen('/balance/', items)).toBe(true);
  });

  it('админка и вложенные страницы — нет', () => {
    for (const path of ['/admin', '/admin/reachability', '/balance/top-up']) {
      expect(isMobileNavScreen(path, items), path).toBe(false);
    }
  });

  it('карточка подписки — да: кнопка «Подписка» приводит именно сюда', () => {
    // Список с единственной подпиской сам открывает её карточку, так что человек
    // нажимает кнопку панели и оказывается здесь. Пропадающая панель на этом
    // экране и была багом.
    expect(isMobileNavScreen('/subscriptions/12', items)).toBe(true);
    expect(isMobileNavScreen('/subscriptions/12/', items)).toBe(true);
  });

  it('но продление изнутри карточки — уже нет', () => {
    expect(isMobileNavScreen('/subscriptions/12/renew', items)).toBe(false);
    expect(isMobileNavScreen('/subscription/purchase', items)).toBe(false);
  });

  it('экран выключенного слота — нет', () => {
    expect(isMobileNavScreen('/referral', items)).toBe(false);
    expect(isMobileNavScreen('/wheel', mobileNavItems({}))).toBe(false);
  });
});
