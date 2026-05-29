import { useEffect } from 'react';
import { siteVerificationApi } from '../api/siteVerification';

/**
 * Fetches the configured site-verification tokens from the bot backend
 * and injects the matching `<meta>` tags into `document.head`.
 *
 * Used by Antilopay's verification flow (lk.antilopay.com → Проект →
 * Верификация → Способ 1: мета-тег). Once the merchant copies the
 * Antilopay-provided value into `ANTILOPAY_APAY_VERIFICATION_TAG`,
 * the cabinet will start rendering `<meta name="apay-tag" content="...">`
 * automatically — no rebuild required.
 *
 * The hook is no-op on backend errors (verification is a best-effort
 * concern and must never block the cabinet from rendering).
 */
export function useSiteVerification(): void {
  useEffect(() => {
    let cancelled = false;

    siteVerificationApi
      .get()
      .then((data) => {
        if (cancelled) return;
        if (data.apay_tag) {
          upsertMetaTag('apay-tag', data.apay_tag);
        } else {
          removeMetaTag('apay-tag');
        }
      })
      .catch(() => {
        // Silent fail — verification meta is best-effort, doesn't block UI.
      });

    return () => {
      cancelled = true;
    };
  }, []);
}

function upsertMetaTag(name: string, content: string): void {
  // Security note: `setAttribute('content', value)` stores `value` as a plain
  // string attribute — the browser does NOT parse it as HTML. Even if a
  // compromised backend returned `</meta><script>alert(1)</script>`, it would
  // be stored literally inside `content="..."` and never executed. DO NOT
  // switch to `innerHTML` / string concatenation into <head> — that would
  // make this an XSS sink.
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function removeMetaTag(name: string): void {
  const tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (tag) {
    tag.remove();
  }
}
