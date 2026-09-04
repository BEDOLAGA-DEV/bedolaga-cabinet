import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  type BrandingInfo,
  brandingApi,
  getCachedBranding,
  getLogoBlobUrl,
  preloadLogo,
  setCachedBranding,
} from '@/api/branding';
import { themeColorsApi } from '@/api/themeColors';
import { DEFAULT_THEME_COLORS } from '@/types/theme';
import {
  type ManifestIcon,
  setAppNameMeta,
  setAppleTouchIcon,
  setDocumentTitle,
  setWebManifest,
  writeBrandHint,
} from '@/utils/documentBranding';
import { letterFaviconDataUri, roundedFaviconDataUri, setFavicon } from '@/utils/favicon';
import { readableTextOnHex } from './useThemeColors';
import { useTheme } from './useTheme';

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';
const APPLE_TOUCH_ICON_PX = 180;
const MANIFEST_ICON_SIZES = [192, 512] as const;
/** Скругление плитки логотипа, как у шапки; монограмма скруглена внутри самого SVG. */
const LOGO_TILE_RADIUS = 0.3;

async function fetchBranding(): Promise<BrandingInfo> {
  const data = await brandingApi.getBranding();
  setCachedBranding(data);
  await preloadLogo(data);
  return data;
}

interface BrandIcons {
  favicon: string;
  touch: string | null;
  manifest: ManifestIcon[];
}

async function rasterSet(
  src: string,
  radiusRatio: number,
): Promise<{ touch: string | null; manifest: ManifestIcon[] }> {
  const [touch, ...sized] = await Promise.all([
    roundedFaviconDataUri(src, APPLE_TOUCH_ICON_PX, radiusRatio),
    ...MANIFEST_ICON_SIZES.map((size) => roundedFaviconDataUri(src, size, radiusRatio)),
  ]);
  const manifest = sized.flatMap((uri, index) =>
    uri
      ? [
          {
            src: uri,
            sizes: `${MANIFEST_ICON_SIZES[index]}x${MANIFEST_ICON_SIZES[index]}`,
            type: 'image/png',
          },
        ]
      : [],
  );
  return { touch, manifest };
}

/**
 * Иконки бренда: логотип инсталляции, иначе монограмма в цвете акцента.
 * Для вкладки годится SVG, для iOS и манифеста нужен PNG — растеризуем через
 * canvas; без canvas манифест получает SVG, а apple-touch-icon не ставится.
 */
async function buildBrandIcons(
  branding: BrandingInfo,
  letter: string,
  accent: string,
): Promise<BrandIcons> {
  if (branding.has_custom_logo) {
    await preloadLogo(branding);
    const blobUrl = getLogoBlobUrl();
    if (blobUrl) {
      const favicon = await roundedFaviconDataUri(blobUrl, 64, LOGO_TILE_RADIUS);
      if (favicon) {
        const { touch, manifest } = await rasterSet(blobUrl, LOGO_TILE_RADIUS);
        return { favicon, touch, manifest };
      }
    }
  }

  const monogram = letterFaviconDataUri(letter, {
    background: accent,
    foreground: readableTextOnHex(accent),
  });
  const { touch, manifest } = await rasterSet(monogram, 0);
  return {
    favicon: monogram,
    touch,
    manifest: manifest.length ? manifest : [{ src: monogram, sizes: 'any', type: 'image/svg+xml' }],
  };
}

/**
 * Единственный владелец бренда в <head> (см. utils/documentBranding). Работает на
 * всех страницах, включая вход и публичные лендинги: раньше заголовок и фавикон
 * ставил только AppShell после авторизации, и посетитель страницы входа видел
 * значения из сборки.
 */
export function useDocumentBranding(): void {
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: fetchBranding,
    initialData: getCachedBranding() ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
    retry: 1,
  });
  const { data: colors } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const { isDark } = useTheme();

  const palette = colors ?? DEFAULT_THEME_COLORS;
  const accent = palette.accent;
  const background = isDark ? palette.darkBackground : palette.lightBackground;
  const name = branding?.name.trim() || FALLBACK_NAME;
  const letter = branding?.logo_letter || FALLBACK_LOGO;
  const appliedTitleRef = useRef<string | null>(null);

  // Пока брендинг не известен, ничего не трогаем: инлайн-скрипт index.html уже
  // показал подсказку прошлого визита, и затирать её значениями сборки нельзя.
  useEffect(() => {
    if (!branding) return;
    appliedTitleRef.current = setDocumentTitle(name, appliedTitleRef.current);
    setAppNameMeta(name);
  }, [branding, name]);

  useEffect(() => {
    if (!branding) return;
    let cancelled = false;
    buildBrandIcons(branding, letter, accent)
      .then((icons) => {
        if (cancelled) return;
        setFavicon(icons.favicon);
        setAppleTouchIcon(icons.touch);
        setWebManifest({
          name,
          icons: icons.manifest,
          themeColor: background,
          backgroundColor: background,
        });
        writeBrandHint({ name, letter, icon: icons.favicon });
      })
      .catch(() => {
        // Иконка не критична: вкладка остаётся со статическим фавиконом сборки.
      });
    return () => {
      cancelled = true;
    };
  }, [branding, name, letter, accent, background]);
}
