import { Link, useLocation } from 'react-router';
import { usePlatform } from '@/platform';
import { BackIcon } from './icons';

interface AdminBackButtonProps {
  to?: string;
  replace?: boolean;
  className?: string;
}

/**
 * Router state that tells a page where its Back button should return.
 *
 * A page declares ONE parent via `to`, but many admin screens are reachable from
 * several places: «Уровни наград» hangs both in the admin menu and inside
 * Партнёры → Настройки, a user card opens from the dashboard, payments, tickets
 * and traffic. The declared parent is right for one entrance and wrong for every
 * other one, and the wrong one is worse than useless: Back walks the operator
 * into screens they never opened.
 *
 * So the entrance passes its own location along with the navigation, and Back
 * honours it. Without state (deep link, reload of a link someone shared) the
 * declared parent still applies.
 */
export interface AdminBackState {
  backTo?: string;
}

/**
 * Internal absolute paths only. `backTo` rides in history state — it survives a
 * reload and is editable from the console — so anything that could leave the
 * cabinet (`//evil.example`, a full URL) is dropped for the declared parent.
 */
function isInternalPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

/** Where Back should go: the entrance that opened this page, else its parent. */
export function resolveAdminBackTarget(state: unknown, fallback: string): string {
  const backTo = (state as AdminBackState | null | undefined)?.backTo;
  return isInternalPath(backTo) ? backTo : fallback;
}

/**
 * Builds the navigation state that makes the opened page return here.
 *
 * Pass it to `navigate(path, backTo(location))` or `<Link state={...}>` whenever
 * the destination lives in another section of the admin panel.
 */
export function backTo(from: { pathname: string; search?: string }): {
  state: AdminBackState;
} {
  return { state: { backTo: `${from.pathname}${from.search ?? ''}` } };
}

/**
 * Back button for admin pages.
 * Hidden in Telegram Mini App since native back button is used instead.
 */
export function AdminBackButton({ to = '/admin', replace, className }: AdminBackButtonProps) {
  const { platform } = usePlatform();
  const location = useLocation();

  // In Telegram Mini App, we use native back button
  if (platform === 'telegram') {
    return null;
  }

  return (
    <Link
      to={resolveAdminBackTarget(location.state, to)}
      replace={replace}
      className={
        className ||
        'flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600'
      }
    >
      <BackIcon />
    </Link>
  );
}
