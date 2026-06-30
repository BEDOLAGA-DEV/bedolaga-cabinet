/**
 * Launch a custom-scheme app deep link (happ://, v2rayng://, vless://, …) without
 * crashing the page inside in-app browsers.
 *
 * Why not `window.location.href = scheme`: a programmatic top-level navigation to a
 * scheme the WebView can't resolve renders a full-page error — on Android in-app
 * browsers (Telegram/Yandex/…) `net::ERR_UNKNOWN_URL_SCHEME`, on iOS it silently does
 * nothing — which destroys the fallback UI (Telegram bug #654272). A hidden <iframe>
 * navigation is contained: if the app is installed the OS intercepts it; if not, the
 * failure stays inside the (invisible) frame and our page — with its manual "Open app"
 * link — survives so the user can tap it (a real user gesture is the reliable trigger).
 *
 * http(s) links are normal navigations and are passed straight to location.href.
 */
export function openAppScheme(url: string): void {
  const isHttp = /^https?:\/\//i.test(url);
  if (isHttp) {
    window.location.href = url;
    return;
  }

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    window.setTimeout(() => {
      try {
        iframe.remove();
      } catch {
        /* already detached */
      }
    }, 2000);
  } catch {
    // iframe creation blocked (very old/locked-down WebView) — fall back to direct
    // navigation. Worst case this shows the same error the iframe avoided, never worse.
    window.location.href = url;
  }
}
