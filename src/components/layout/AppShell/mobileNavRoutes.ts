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
}

const HEAD: readonly MobileNavItem[] = [
  { key: 'dashboard', path: '/' },
  { key: 'subscription', path: '/subscriptions' },
  { key: 'balance', path: '/balance' },
];
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
  return [...HEAD, ...slotItems(flags), SUPPORT];
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
  return NAV_SCREEN_PATTERNS.some((pattern) => pattern.test(path));
}
