import { useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, useLocation, useNavigate, useNavigationType } from 'react-router';
import {
  showBackButton,
  hideBackButton,
  onBackButtonClick,
  offBackButtonClick,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react';
import { useQuery } from '@tanstack/react-query';
import Twemoji from 'react-twemoji';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PlatformProvider } from './platform/PlatformProvider';
import { ThemeColorsProvider } from './providers/ThemeColorsProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import { ToastProvider } from './components/Toast';
import { TooltipProvider } from './components/primitives/Tooltip';
import { isInTelegramWebApp, closeTelegramApp } from './hooks/useTelegramSDK';
import { getFallbackParentPath } from './utils/navigation';
import { subscriptionApi } from './api/subscription';
import { useBlockingStore } from './store/blocking';

const TWEMOJI_OPTIONS = { className: 'twemoji', folder: 'svg', ext: '.svg' } as const;

/**
 * Manages Telegram BackButton visibility based on navigation location.
 * Shows back button on non-root routes, hides on root.
 */
/** Pages reachable from bottom nav — treat as top-level (no back button). */
const BOTTOM_NAV_PATHS = ['/', '/subscriptions', '/balance', '/referral', '/support', '/wheel'];

/** Matches /subscriptions/:numericId. When the user has a single tariff and at
 * most one subscription, the /subscriptions list auto-redirects straight back
 * here (Subscriptions.tsx), so this page is effectively top-level: we hide the
 * back button and let Telegram surface its native Close (X). Multi-tariff users
 * (or anyone with >1 subscription) keep a real Back to their meaningful list. */
const SUBSCRIPTION_DETAIL_RE = /^\/subscriptions\/\d+\/?$/;

function TelegramBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  // A full-screen blocking overlay (maintenance / channel-sub / blacklist /
  // account-deleted / backend-unavailable) takes over the native back button:
  // there is nowhere to navigate, so it becomes a single, stable EXIT control.
  const blockingType = useBlockingStore((state) => state.blockingType);
  const blockingTypeRef = useRef(blockingType);
  blockingTypeRef.current = blockingType;

  // Reliable in-app navigation depth (the app's entry point is 0). Driven by
  // React Router's navigation TYPE — NOT window.history.state.idx, which the
  // app's own redirects mutate unpredictably and which is the root flake behind
  // issue #436 (the back button shows/acts on the wrong state). PUSH goes
  // deeper, POP unwinds, REPLACE (e.g. the Subscriptions.tsx auto-redirect) is
  // flat. De-duped by location.key so StrictMode's double-effect can't miscount.
  const depthRef = useRef(0);
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    lastKeyRef.current = location.key;
    if (navType === 'PUSH') depthRef.current += 1;
    else if (navType === 'POP') depthRef.current = Math.max(0, depthRef.current - 1);
    // REPLACE: depth unchanged (replaces the current entry, adds no history)
  }, [location.key, navType]);

  // Share the subscriptions-list query with the page-level components.
  // React Query dedupes by key so this does not cause an extra fetch when
  // Subscriptions/Subscription/Dashboard pages mount.
  const { data: subData } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 30_000,
    // Don't fetch outside Telegram — the cabinet still loads on the web.
    enabled: isInTelegramWebApp(),
  });
  const isMultiTariff = subData?.multi_tariff_enabled ?? false;
  const subsCount = subData?.subscriptions?.length ?? 0;
  // The /subscriptions list silently redirects straight back to the open detail
  // page when there is a single tariff and at most one subscription
  // (Subscriptions.tsx). In that mode the detail page IS the top-level screen —
  // there is no meaningful "back" target. Inverse of the handler's `listIsSafe`.
  // Defaults to true on a cold cache (isMultiTariff=false, subsCount=0): hiding
  // Back is fail-closed — far better than briefly arming the looping Back.
  const listRedirectsToDetail = !isMultiTariff && subsCount <= 1;

  // Refs so the stable back handler (memoised with []) reads fresh values
  // without re-subscribing — re-subscription lets a component's local handler
  // overwrite ours via Telegram's singleton onBackButtonClick (issue #436).
  const isMultiTariffRef = useRef(isMultiTariff);
  isMultiTariffRef.current = isMultiTariff;
  const subsCountRef = useRef(subsCount);
  subsCountRef.current = subsCount;

  useEffect(() => {
    // On a blocking overlay, keep exactly one visible Back button (its click
    // exits the app — see handler). Skip the route logic so it can't flip
    // between Back and Close as the hidden route changes underneath.
    if (blockingType) {
      try {
        showBackButton();
      } catch {}
      return;
    }
    const isTopLevel = location.pathname === '' || BOTTOM_NAV_PATHS.includes(location.pathname);
    // Depth-independent on purpose: whether the user deep-linked in or navigated
    // here in-app, a single-tariff detail whose list just bounces back has no
    // real "back" target. Showing Back here is exactly what looped through the
    // redirecting /subscriptions list (#436); hiding it always surfaces Close.
    const isRedirectingSubscriptionDetail =
      listRedirectsToDetail && SUBSCRIPTION_DETAIL_RE.test(location.pathname);
    try {
      if (isTopLevel || isRedirectingSubscriptionDetail) {
        hideBackButton();
      } else {
        showBackButton();
      }
    } catch {}
  }, [location, listRedirectsToDetail, blockingType]);

  // Stable handler — ref prevents re-subscription on every render
  const handler = useCallback(() => {
    // A blocking overlay is a hard block with nowhere to navigate — the back
    // button's only job is to EXIT the Mini App (no SPA navigation, so it can't
    // flip-flop between Back and Close).
    if (blockingTypeRef.current) {
      closeTelegramApp();
      return;
    }
    // Real in-app history (depth > 0): a normal back. Otherwise we were opened
    // directly on this route via a deep-link — navigate(-1) is a no-op, so fall
    // back to a sensible parent route instead.
    if (depthRef.current > 0) {
      navigateRef.current(-1);
      return;
    }
    // /subscriptions/:id is special: the /subscriptions list auto-redirects
    // straight back to a detail page when single-tariff with exactly one
    // subscription (Subscriptions.tsx), so falling back there loops silently and
    // the back button looks dead (issue #436). Land on the list ONLY when it is
    // PROVABLY safe (multi-tariff, or more than one subscription — neither of
    // which auto-redirects); otherwise escape to root.
    //
    // Fail-closed on purpose: `subsCount <= 1` is treated as not-safe, which
    // also covers the stale default 0 before the shared subscriptions query
    // resolves — so a fast tap on a cold cache can never route into the
    // redirecting list and re-open the loop.
    const pathname = pathnameRef.current;
    const listIsSafe = isMultiTariffRef.current || subsCountRef.current > 1;
    const fallback =
      SUBSCRIPTION_DETAIL_RE.test(pathname) && !listIsSafe
        ? '/'
        : getFallbackParentPath(pathnameRef.current);
    navigateRef.current(fallback, { replace: true });
  }, []);

  useEffect(() => {
    try {
      onBackButtonClick(handler);
    } catch {}
    return () => {
      try {
        offBackButtonClick(handler);
      } catch {}
    };
  }, [handler]);

  return null;
}

/** `admin_ticket_<id>` startapp param → /admin/tickets/<id>. */
const ADMIN_TICKET_START_PARAM_RE = /^admin_ticket_(\d+)$/;

/**
 * Routes a Telegram Mini App start param to an in-app destination on launch.
 *
 * Admin ticket notification buttons in GROUP/channel chats open the cabinet via
 * a `t.me/<bot>/<app>?startapp=admin_ticket_<id>` deep link (bot issue #2988) —
 * `web_app` buttons don't work in group chats, so the startapp param is the only
 * way in. Telegram delivers it as `tgWebAppStartParam`; we map it to the admin
 * ticket route once on mount. Access is still gated by the route's
 * `PermissionRoute permission="tickets:read"`.
 */
function StartParamNavigator() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    let startParam: string | undefined;
    try {
      startParam = retrieveLaunchParams().tgWebAppStartParam;
    } catch {
      return;
    }
    if (!startParam) return;

    const match = ADMIN_TICKET_START_PARAM_RE.exec(startParam);
    if (match) {
      navigate(`/admin/tickets/${match[1]}`, { replace: true });
    }
  }, [navigate]);

  return null;
}

export function AppWithNavigator() {
  const isTelegram = isInTelegramWebApp();

  return (
    <BrowserRouter>
      {isTelegram && <TelegramBackButton />}
      {isTelegram && <StartParamNavigator />}
      <ErrorBoundary level="page">
        <PlatformProvider>
          <ThemeColorsProvider>
            <TooltipProvider>
              <ToastProvider>
                <WebSocketProvider>
                  <Twemoji options={TWEMOJI_OPTIONS}>
                    <App />
                  </Twemoji>
                </WebSocketProvider>
              </ToastProvider>
            </TooltipProvider>
          </ThemeColorsProvider>
        </PlatformProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
