import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '../api/branding';

const YM_SCRIPT_ID = 'ym-counter-script';
const GTAG_LOADER_ID = 'gtag-loader-script';
const GTAG_INIT_ID = 'gtag-init-script';

function removeElement(id: string) {
  document.getElementById(id)?.remove();
}

function injectYandexMetrika(counterId: string) {
  try { localStorage.setItem('ym_counter_id', counterId); } catch { /* sandboxed / private */ }
  if (document.getElementById(YM_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = YM_SCRIPT_ID;
  script.type = 'text/javascript';
  script.textContent = `
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    ym(${counterId}, "init", {
      clickmap:true,
      trackLinks:true,
      accurateTrackBounce:true,
      webvisor:true
    });
  `;
  document.head.appendChild(script);
}

function injectGoogleAds(conversionId: string) {
  if (document.getElementById(GTAG_LOADER_ID)) return;

  // External gtag.js loader
  const loader = document.createElement('script');
  loader.id = GTAG_LOADER_ID;
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
  document.head.appendChild(loader);

  // Init script
  const init = document.createElement('script');
  init.id = GTAG_INIT_ID;
  init.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${conversionId}');
  `;
  document.head.appendChild(init);
}

/**
 * Fetches analytics counter settings from the API and dynamically
 * injects Yandex Metrika and/or Google Ads scripts into <head>.
 */
export function useAnalyticsCounters() {
  const { data } = useQuery({
    queryKey: ['analytics-counters'],
    queryFn: brandingApi.getAnalyticsCounters,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  useEffect(() => {
    if (!data) return;

    // Yandex Metrika
    if (data.yandex_metrika_id) {
      injectYandexMetrika(data.yandex_metrika_id);
      cacheYandexCid(data.yandex_metrika_id);
      syncYandexCid(data.yandex_metrika_id);
    } else {
      removeElement(YM_SCRIPT_ID);
    }

    // Google Ads
    if (data.google_ads_id) {
      injectGoogleAds(data.google_ads_id);
    } else {
      removeElement(GTAG_LOADER_ID);
      removeElement(GTAG_INIT_ID);
    }
  }, [data]);
}

function cacheYandexCid(counterId: string) {
  const w = window as unknown as Record<string, unknown>;
  const ym = w.ym as ((...args: unknown[]) => void) | undefined;
  if (typeof ym !== 'function') return;
  setTimeout(() => {
    try {
      (w.ym as (...args: unknown[]) => void)(Number(counterId), 'getClientID', (cid: string) => {
        if (cid) localStorage.setItem('ym_client_id', cid);
      });
    } catch {}
  }, 2000);
}

function syncYandexCid(counterId: string) {
  const SENT_KEY = 'ym_cid_sent';
  try {
    if (localStorage.getItem(SENT_KEY)) return;
  } catch {
    // localStorage may throw in sandboxed iframes / Safari private mode
    return;
  }
  const w = window as unknown as Record<string, unknown>;
  const ym = w.ym as ((...args: unknown[]) => void) | undefined;
  if (typeof ym !== 'function') return;
  setTimeout(() => {
    try {
      (w.ym as (...args: unknown[]) => void)(Number(counterId), 'getClientID', (cid: string) => {
        if (!cid) return;
        try {
          localStorage.setItem('ym_client_id', cid);
        } catch {
          /* ignore storage errors */
        }
        // Only POST when the user is authenticated — guest sessions just store
        // the CID locally; it will be sent on next login.
        let token: string | null = null;
        try {
          token = localStorage.getItem('access_token');
        } catch {
          /* ignore */
        }
        if (!token) return;
        // Route through apiClient so baseURL, auth refresh, and error handling
        // all flow through the same interceptors as every other cabinet call.
        import('../api/branding').then(({ brandingApi }) => {
          brandingApi
            .storeYandexCid(cid)
            .then(() => {
              try {
                localStorage.setItem(SENT_KEY, '1');
              } catch {
                /* ignore */
              }
            })
            .catch(() => {
              /* swallow — non-critical, will retry on next login */
            });
        });
      });
    } catch {}
  }, 3000);
}

// Stubs for CID - will be implemented after webvisor test
export function fireAnalyticsEvent(goalName: string, params?: Record<string, unknown>) {
  const ym = (window as any).ym;
  if (typeof ym === 'function') {
    try {
      const counterId = localStorage.getItem('ym_counter_id');
      if (counterId && /^\d{1,15}$/.test(counterId)) {
        ym(Number(counterId), 'reachGoal', goalName, params);
      }
    } catch {}
  }
}

export function getYandexCid(): string | null {
  return localStorage.getItem('ym_client_id');
}
