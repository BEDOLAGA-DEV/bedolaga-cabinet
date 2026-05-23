import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTelegramSDK, setCachedFullscreenEnabled } from '@/hooks/useTelegramSDK';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
} from '@/api/branding';

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';

export function useBranding() {
  const { isTelegramWebApp, requestFullscreen, isMobile } = useTelegramSDK();

  // Branding data. The /cabinet/branding endpoint is public, so we fetch it
  // regardless of auth state — this lets unauthenticated surfaces (Login, app
  // download banner) render branded copy and the correct logo.
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding();
      setCachedBranding(data);
      await preloadLogo(data);
      return data;
    },
    initialData: getCachedBranding() ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 60000,
  });

  const appName = branding ? branding.name : FALLBACK_NAME;
  const logoLetter = branding?.logo_letter || FALLBACK_LOGO;
  const hasCustomLogo = branding?.has_custom_logo || false;
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  // Set document title
  useEffect(() => {
    document.title = appName || 'VPN';
  }, [appName]);

  // Update favicon
  useEffect(() => {
    if (!logoUrl) return;

    const link =
      document.querySelector<HTMLLinkElement>("link[rel*='icon']") ||
      document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = logoUrl;
    document.head.appendChild(link);
  }, [logoUrl]);

  // Fullscreen setting from server
  const { data: fullscreenSetting } = useQuery({
    queryKey: ['fullscreen-enabled'],
    queryFn: brandingApi.getFullscreenEnabled,
    staleTime: 60000,
  });

  const fullscreenRequestedRef = useRef(false);

  useEffect(() => {
    if (!fullscreenSetting || !isTelegramWebApp) return;
    setCachedFullscreenEnabled(fullscreenSetting.enabled);
    if (fullscreenSetting.enabled && isMobile && !fullscreenRequestedRef.current) {
      fullscreenRequestedRef.current = true;
      requestFullscreen();
    }
  }, [fullscreenSetting, isTelegramWebApp, requestFullscreen, isMobile]);

  return {
    appName,
    logoLetter,
    hasCustomLogo,
    logoUrl,
    isLogoPreloaded,
  };
}
