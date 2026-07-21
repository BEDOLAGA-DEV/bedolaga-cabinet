/**
 * Launch a custom-scheme app deep link (happ://, incy://, v2rayng://, vless://, …)
 * without crashing the page inside in-app browsers, and — crucially — in a way that
 * actually opens the app on iOS.
 *
 * Two failure modes have to be worked around, and they need opposite fixes:
 *
 * - Android in-app browsers (Telegram/Yandex/…): a top-level `location.href = scheme`
 *   the WebView can't resolve paints a full-page `net::ERR_UNKNOWN_URL_SCHEME`, wiping
 *   the fallback UI (Telegram bug #654272). A hidden <iframe> navigation is contained:
 *   the OS intercepts it if the app is installed, otherwise the failure stays inside the
 *   invisible frame and our manual "Open app" link survives.
 *
 * - iOS (Safari + WKWebView): the OS launches a custom scheme ONLY from a top-level
 *   navigation tied to a user gesture. A hidden-iframe `src` to a custom scheme is a
 *   silent no-op — the app never opens even when installed. So on iOS we must use
 *   `location.href`. openAppScheme is called synchronously from the button's click
 *   handler, so the gesture is still active here and the installed app launches.
 *
 * http(s) links are normal navigations and are passed straight to location.href.
 */

/**
 * True on iOS/iPadOS. iPadOS 13+ reports itself as desktop Safari, so a touch-capable
 * "Mac" is treated as an iPad.
 */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iP(ad|hone|od)/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function openAppScheme(url: string): void {
  const isHttp = /^https?:\/\//i.test(url);
  if (isHttp) {
    window.location.href = url;
    return;
  }

  // iOS ignores custom-scheme launches from an iframe — it needs a gesture-bound
  // top-level navigation, which this is (called synchronously from the click handler).
  if (isIOS()) {
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
