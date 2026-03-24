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
      accurateTrackBounce:true
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
 * Fire an analytics event to all configured counters.
 * Works with both Yandex Metrika (reachGoal) and Google Ads (gtag event).
 */
export function fireAnalyticsEvent(goalName: string, params?: Record<string, unknown>) {
  // Yandex Metrika
  const ym = (window as any).ym;
  if (typeof ym === 'function') {
    try {
      const counterId = localStorage.getItem('ym_counter_id');
      if (counterId) {
        ym(Number(counterId), 'reachGoal', goalName, params);
      }
    } catch { /* silent */ }
  }

  // Google Ads / gtag
  const gtag = (window as any).gtag;
  if (typeof gtag === 'function') {
    try {
      gtag('event', goalName, params);
    } catch { /* silent */ }
  }
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
      localStorage.setItem('ym_counter_id', data.yandex_metrika_id);
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
