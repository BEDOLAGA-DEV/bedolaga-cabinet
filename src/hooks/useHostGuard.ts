import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Paths that must live on the public (apex) host only. Legal/info pages are
 * intentionally not listed here: they must work both publicly on apex and inside
 * the authenticated cabinet origin so auth state is not lost during navigation.
 */
const APEX_ONLY_PREFIXES = ['/home'];

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Bidirectional host guard for a landing / cabinet split setup.
 *
 * Requires `VITE_CABINET_HOST` to be set (e.g. `cabinet.example.com`).
 * Apex host is derived by stripping the first DNS label from the cabinet host,
 * or provide it explicitly via `VITE_PUBLIC_HOST` for non-standard setups.
 *
 * Behavior:
 * - On apex host + cabinet path → full-page redirect to the cabinet host.
 * - On cabinet host + apex-only path → full-page redirect to the apex host.
 * - Otherwise: no-op.
 *
 * Leave `VITE_CABINET_HOST` empty to disable (single-domain deployments).
 */
export function useHostGuard() {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const cabinetHost = import.meta.env.VITE_CABINET_HOST;
    if (!cabinetHost) return;

    const currentHost = window.location.hostname;
    const isOnCabinet = currentHost === cabinetHost;
    const isApexOnly = matchesAny(location.pathname, APEX_ONLY_PREFIXES);
    const suffix = `${location.pathname}${location.search}${location.hash}`;
    const proto = window.location.protocol;

    // Cabinet-only path rendered on apex → push to cabinet
    if (!isOnCabinet && !isApexOnly) {
      window.location.replace(`${proto}//${cabinetHost}${suffix}`);
      return;
    }

    // Apex-only path rendered on cabinet → push to apex
    if (isOnCabinet && isApexOnly) {
      const explicitApex = import.meta.env.VITE_PUBLIC_HOST;
      const derivedApex = cabinetHost.includes('.')
        ? cabinetHost.slice(cabinetHost.indexOf('.') + 1)
        : '';
      const apexHost = explicitApex || derivedApex;
      if (apexHost && apexHost !== currentHost) {
        window.location.replace(`${proto}//${apexHost}${suffix}`);
      }
    }
  }, [location]);
}
