import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '../api/branding';
import { setYandexCid } from '../utils/yandexCid';

const YM_SCRIPT_ID = 'ym-counter-script';
const GTAG_LOADER_ID = 'gtag-loader-script';
const GTAG_INIT_ID = 'gtag-init-script';

function removeElement(id: string) {
  document.getElementById(id)?.remove();
}

function injectYandexMetrika(counterId: string) {
  if (!/^\d{1,15}$/.test(counterId)) return;
  try {
    localStorage.setItem('ym_counter_id', counterId);
  } catch {
    /* sandboxed / private */
  }
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
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(conversionId)) return;
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
        if (cid) setYandexCid(cid);
      });
    } catch {
      /* ignore */
    }
  }, 2000);
}

function syncYandexCid(counterId: string) {
  const SENT_KEY = 'ym_cid_sent';
  try {
    if (localStorage.getItem(SENT_KEY)) return;
  } catch {
    return;
  }
  const w = window as unknown as Record<string, unknown>;
  const ym = w.ym as ((...args: unknown[]) => void) | undefined;
  if (typeof ym !== 'function') return;
  setTimeout(() => {
    try {
      (w.ym as (...args: unknown[]) => void)(Number(counterId), 'getClientID', (cid: string) => {
        if (!cid) return;
        setYandexCid(cid);
        // Only POST when the user is authenticated. Guest sessions cache the
        // CID locally; it gets synced after login by the next mount of this
        // hook on the cabinet shell.
        let token: string | null = null;
        try {
          token = localStorage.getItem('access_token');
        } catch {
          /* ignore */
        }
        if (!token) return;
        // Route through brandingApi (apiClient) so baseURL, auth refresh, and
        // error handling all flow through the same interceptors as every other
        // cabinet API call.
        import('../api/branding').then(({ brandingApi: api }) => {
          api
            .storeYandexCid(cid)
            .then(() => {
              try {
                localStorage.setItem(SENT_KEY, '1');
              } catch {
                /* ignore */
              }
            })
            .catch(() => {
              /* swallow -- non-critical, will retry on next login */
            });
        });
      });
    } catch {
      /* ignore */
    }
  }, 3000);
}

export function fireAnalyticsEvent(goalName: string, params?: Record<string, unknown>) {
  const w = window as unknown as Record<string, unknown>;
  const ym = w.ym as ((...args: unknown[]) => void) | undefined;
  if (typeof ym === 'function') {
    try {
      const counterId = localStorage.getItem('ym_counter_id');
      if (counterId && /^\d{1,15}$/.test(counterId)) {
        ym(Number(counterId), 'reachGoal', goalName, params);
      }
    } catch {
      /* ignore */
    }
  }
}

// Re-export the canonical CID accessor from utils for back-compat with
// existing imports inside this hook file. New code should import from
// '../utils/yandexCid' directly to avoid pulling React into api/.
export { getYandexCid } from '../utils/yandexCid';
