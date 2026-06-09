import axios from 'axios';
import { useBlockingStore } from '../store/blocking';

/**
 * Backend liveness probe + "service unavailable" detection.
 *
 * The bot backend serves an unauthenticated liveness endpoint at the host ROOT
 * (`/health/unified` when the Web API is enabled, `/health` otherwise) — NOT
 * under the apiClient baseURL (`/api`). So we probe it with a BARE axios call at
 * a root-relative URL, deliberately bypassing both the baseURL and the apiClient
 * response interceptor (a probe must never itself touch blocking state).
 */
function resolveHealthUrl(): string {
  const override = import.meta.env.VITE_HEALTH_URL;
  if (override) return override;
  const apiUrl = String(import.meta.env.VITE_API_URL || '/api').trim();
  // For an absolute API base (remote / sub-path deployments like
  // `https://api.bot.com/cabinet`) the health route still lives at the host
  // ROOT, so derive the origin — NOT just strip `/api`. Mirrors the URL parsing
  // in WebSocketProvider. For a relative base (`/api`, `/cabinet`) health is
  // same-origin at the site root.
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    try {
      return `${new URL(apiUrl).origin}/health/unified`;
    } catch {
      // malformed URL — fall through to the root-relative path
    }
  }
  return '/health/unified';
}

export const HEALTH_URL = resolveHealthUrl();

// Statuses a reverse proxy returns when it is up but its API upstream is down.
// These must count as NOT reachable, otherwise the recovery poll would reload
// the app straight back into a still-broken backend.
const GATEWAY_DOWN_STATUSES = new Set([502, 503, 504]);

/**
 * Resolves true when the backend is actually serving — i.e. it returns an HTTP
 * response that is NOT a gateway-down status. A 404 still counts as up (a
 * Web-API-disabled deployment serves `/health`, not `/health/unified`, so
 * probing the latter 404s while the server is fine). A 502/503/504 means a front
 * proxy is up but the API upstream is dead, so it counts as NOT reachable.
 * Resolves false on a transport-level failure with no response.
 */
export async function pingBackend(): Promise<boolean> {
  try {
    await axios.get(HEALTH_URL, { timeout: 5000 });
    return true;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      return !GATEWAY_DOWN_STATUSES.has(err.response.status);
    }
    return false;
  }
}

let everReachedBackend = false;

/** Called on the first successful API response: the app reached the backend at
 *  least once, so a later outage struck an already-loaded session. */
export function markBackendReached(): void {
  everReachedBackend = true;
}

/** True once the app has had at least one successful backend response. Lets the
 *  ServiceUnavailableScreen recover by lifting the overlay (state preserved)
 *  rather than hard-reloading, which is only needed when the INITIAL bootstrap
 *  never reached the backend. */
export function hasEverReachedBackend(): boolean {
  return everReachedBackend;
}

let confirmInFlight = false;

/**
 * Called from the places that see a transport-level (no-response) failure — the
 * apiClient interceptor and the bootstrap token refresh. Rather than blanking
 * the whole app on a single one-off network blip, it CONFIRMS the outage with a
 * liveness probe first and only then flips the global `backend_unavailable`
 * state that renders the full-screen ServiceUnavailableScreen. Fire-and-forget:
 * callers still reject/handle their own request immediately. Guarded so a burst
 * of failing requests triggers at most one probe, and skipped once the screen is
 * already shown.
 */
export async function reportPossibleBackendDown(): Promise<void> {
  if (useBlockingStore.getState().blockingType === 'backend_unavailable') return;
  // During the INITIAL bootstrap (we've never reached the backend yet) the
  // caller's failed request is itself the confirmation, so flip the screen
  // IMMEDIATELY and synchronously. A deferred probe here would let the /login
  // page paint for the ~probe duration before the outage screen — the "jump"
  // we must avoid. Once the app has loaded, fall through to the confirm-probe so
  // a one-off network blip can't blank a working session.
  if (!everReachedBackend) {
    useBlockingStore.getState().setBackendUnavailable();
    return;
  }
  if (confirmInFlight) return;
  confirmInFlight = true;
  try {
    const reachable = await pingBackend();
    if (!reachable) {
      useBlockingStore.getState().setBackendUnavailable();
    }
  } finally {
    confirmInFlight = false;
  }
}

/**
 * Eager liveness check fired once at app launch (from main.tsx), in parallel
 * with auth bootstrap. If the backend is already down at launch this paints the
 * ServiceUnavailableScreen immediately — before the auth flow can flash the
 * /login page — even on the no-stored-token path that makes no early request.
 * No-op if the app has already reached the backend or another blocking screen
 * is showing.
 */
export async function checkBackendOnStartup(): Promise<void> {
  if (everReachedBackend) return;
  if (useBlockingStore.getState().blockingType !== null) return;
  const reachable = await pingBackend();
  if (!reachable && !everReachedBackend && useBlockingStore.getState().blockingType === null) {
    useBlockingStore.getState().setBackendUnavailable();
  }
}
