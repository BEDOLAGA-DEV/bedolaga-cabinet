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
import { themeColorsQueryOptions } from '@/api/themeColors';
import { DEFAULT_THEME_COLORS } from '@/types/theme';
import {
  type ManifestIcon,
  markBrandApplied,
  setAppNameMeta,
  setAppleTouchIcon,
  setDocumentTitle,
  setWebManifest,
  writeBrandHint,
} from '@/utils/documentBranding';
import {
  letterFaviconDataUri,
  roundedFaviconDataUri,
  setFavicon,
  squareIconDataUri,
} from '@/utils/favicon';
import { readableTextOnHex } from './useThemeColors';
import { useTheme } from './useTheme';

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';
const APPLE_TOUCH_ICON_PX = 180;
const MANIFEST_ICON_SIZES = [192, 512] as const;
/** Скругление плитки логотипа во вкладке, как у шапки; для ярлыков не скругляем. */
const LOGO_TILE_RADIUS = 0.3;
/** Безопасная зона maskable-иконок Android: содержимое в центральных 80 %. */
const MASKABLE_SAFE_ZONE = 0.8;

async function fetchBranding(): Promise<BrandingInfo> {
  const data = await brandingApi.getBranding();
  setCachedBranding(data);
  await preloadLogo(data);
  return data;
}

interface BrandIcons {
  /** data: URI для вкладки; null — ссылку не трогаем: в index.html она ведёт на эндпоинт бота с самим логотипом. */
  favicon: string | null;
  touch: string | null;
  manifest: ManifestIcon[];
}

/**
 * Иконки для ярлыков: непрозрачные квадраты на `background` без скругления —
 * iOS и Android накладывают свою маску, а прозрачные углы рисуют белым.
 * Для Android добавляем вариант maskable с содержимым в безопасной зоне.
 */
async function shortcutIcons(
  src: string,
  background: string,
): Promise<{ touch: string | null; manifest: ManifestIcon[] }> {
  const [touch, ...sized] = await Promise.all([
    squareIconDataUri(src, APPLE_TOUCH_ICON_PX, { background }),
    ...MANIFEST_ICON_SIZES.flatMap((size) => [
      squareIconDataUri(src, size, { background }),
      squareIconDataUri(src, size, { background, contentScale: MASKABLE_SAFE_ZONE }),
    ]),
  ]);
  const manifest = MANIFEST_ICON_SIZES.flatMap((size, index): ManifestIcon[] => {
    const sizes = `${size}x${size}`;
    const any = sized[index * 2];
    const maskable = sized[index * 2 + 1];
    return [
      ...(any ? [{ src: any, sizes, type: 'image/png', purpose: 'any' as const }] : []),
      ...(maskable
        ? [{ src: maskable, sizes, type: 'image/png', purpose: 'maskable' as const }]
        : []),
    ];
  });
  return { touch, manifest };
}

/**
 * Иконки бренда: логотип инсталляции, иначе монограмма в цвете акцента.
 * Во вкладке — скруглённая плитка (прозрачные углы там безвредны), для
 * ярлыков — непрозрачные квадраты. Без canvas манифест получает SVG, а
 * apple-touch-icon не ставится.
 *
 * Вкладке нужен PNG: Safari рисует SVG-фавикон монохромной плиткой с буквой, а
 * подсказка первого кадра хранит только PNG. Поэтому монограмму растеризуем, а
 * когда логотип есть, но в PNG не превратился (не загрузился, canvas недоступен),
 * ссылку вкладки не трогаем: в index.html она ведёт на эндпоинт бота с самим
 * логотипом — это лучше любой монограммы.
 */
async function buildBrandIcons(
  branding: BrandingInfo,
  letter: string,
  accent: string,
  background: string,
): Promise<BrandIcons> {
  if (branding.has_custom_logo) {
    await preloadLogo(branding);
    const blobUrl = getLogoBlobUrl();
    if (blobUrl) {
      const [favicon, shortcuts] = await Promise.all([
        roundedFaviconDataUri(blobUrl, 64, LOGO_TILE_RADIUS),
        shortcutIcons(blobUrl, background),
      ]);
      return { favicon, ...shortcuts };
    }
  }

  const monogram = letterFaviconDataUri(letter, {
    background: accent,
    foreground: readableTextOnHex(accent),
  });
  // Заливка тем же акцентом, что и плашка внутри SVG: углы сливаются, белых пятен нет.
  const [raster, { touch, manifest }] = await Promise.all([
    roundedFaviconDataUri(monogram, 64, 0),
    shortcutIcons(monogram, accent),
  ]);
  return {
    favicon: branding.has_custom_logo ? null : (raster ?? monogram),
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
  const { data: colors } = useQuery(themeColorsQueryOptions());
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
    buildBrandIcons(branding, letter, accent, background)
      .then((icons) => {
        if (cancelled) return;
        if (icons.favicon) setFavicon(icons.favicon);
        // С этого момента ранний инлайн-скрипт index.html бренд не трогает.
        markBrandApplied();
        setAppleTouchIcon(icons.touch);
        setWebManifest({
          name,
          icons: icons.manifest,
          themeColor: background,
          backgroundColor: background,
        });
        writeBrandHint({ name, letter, icon: icons.favicon ?? undefined });
      })
      .catch(() => {
        // Иконка не критична: вкладка остаётся со статическим фавиконом сборки.
      });
    return () => {
      cancelled = true;
    };
  }, [branding, name, letter, accent, background]);
}
