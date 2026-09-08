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

/** Точное совпадение с экраном кнопки: детали подписки или пополнение — уже не экран панели. */
export function isMobileNavScreen(pathname: string, items: readonly MobileNavItem[]): boolean {
  const path = withoutTrailingSlash(pathname);
  return items.some((item) => item.path === path);
}
