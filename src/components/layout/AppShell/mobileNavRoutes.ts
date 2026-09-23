/**
 * Экраны нижней панели на телефоне. Панель живёт только там, куда ведут её
 * кнопки: на вложенных страницах и в админке её нет, и место под неё не
 * резервируется (AppShell ставит data-mobile-nav="off", см. globals.css).
 */
export type MobileNavKey =
  | 'dashboard'
  | 'subscription'
  | 'balance'
  | 'wheel'
  | 'referral'
  | 'support';

export interface MobileNavItem {
  /** Ключ пункта: хвост ключа перевода `nav.*` и ключ иконки в панели. */
  readonly key: MobileNavKey;
  readonly path: string;
}

export interface MobileNavFlags {
  readonly wheelEnabled?: boolean;
  readonly referralEnabled?: boolean;
  /**
   * Простой вид: главный экран сам и есть экран подписки, поэтому отдельная
   * кнопка «Подписка» ведёт человека туда, где он уже стоит. Ровно это
   * дублирование «Главного» и «Подписки» и заставило завести простой вид.
   */
  readonly lite?: boolean;
}

const DASHBOARD: MobileNavItem = { key: 'dashboard', path: '/' };
const SUBSCRIPTION: MobileNavItem = { key: 'subscription', path: '/subscriptions' };
const BALANCE: MobileNavItem = { key: 'balance', path: '/balance' };
const SUPPORT: MobileNavItem = { key: 'support', path: '/support' };
const WHEEL: MobileNavItem = { key: 'wheel', path: '/wheel' };
const REFERRAL: MobileNavItem = { key: 'referral', path: '/referral' };

/**
 * Поддержка есть всегда: платящему клиенту с проблемой помощь нужна в основной
 * навигации, а не в меню шапки. Под колесо и рефералку остаётся один слот:
 * колесо (оператор включил его как бренд-момент) важнее, рефералка уходит в шапку.
 */
function slotItems({ wheelEnabled, referralEnabled }: MobileNavFlags): readonly MobileNavItem[] {
  if (wheelEnabled) return [WHEEL];
  if (referralEnabled) return [REFERRAL];
  return [];
}

export function mobileNavItems(flags: MobileNavFlags): readonly MobileNavItem[] {
  const head = flags.lite ? [DASHBOARD, BALANCE] : [DASHBOARD, SUBSCRIPTION, BALANCE];
  return [...head, ...slotItems(flags), SUPPORT];
}

function withoutTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * Экраны, куда кнопка панели приводит не напрямую.
 *
 * «Подписка» ведёт на список, а список с единственной подпиской сам открывает её
 * карточку (Subscriptions.tsx). Для клиента это и есть экран кнопки: он нажал
 * «Подписка» и оказался здесь — панель пропадать не должна. Продление и покупка
 * сюда не попадают: туда уходят уже изнутри карточки.
 */
const NAV_SCREEN_PATTERNS: readonly RegExp[] = [/^\/subscriptions\/\d+$/];

/** Экран кнопки: сам путь пункта или то, во что он разворачивается. */
export function isMobileNavScreen(pathname: string, items: readonly MobileNavItem[]): boolean {
  const path = withoutTrailingSlash(pathname);
  if (items.some((item) => item.path === path)) return true;

  // Карточка подписки — экран кнопки только пока такая кнопка есть. В простом
  // виде её нет, и карточка становится обычной вложенной страницей: панель на
  // ней показывалась бы без пункта, который туда ведёт.
  if (!items.some((item) => item.path === SUBSCRIPTION.path)) return false;
  return NAV_SCREEN_PATTERNS.some((pattern) => pattern.test(path));
}
