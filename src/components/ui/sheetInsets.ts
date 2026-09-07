/** Воздух между верхом шита и тем, что над ним (шапка Telegram или край экрана). */
const TOP_GAP_PX = 8;

export interface SheetInsetsInput {
  /** Доля высоты экрана (snap point), 0–1. */
  snap: number;
  /** Отступ Telegram сверху из SDK (fullscreen Mini App); 0 вне Telegram. */
  topSafeArea: number;
  /** Отступ Telegram снизу из SDK; 0 вне Telegram. */
  bottomSafeArea: number;
}

/**
 * Геометрия нижнего шита: высота считается от видимого экрана (в Telegram —
 * `--tg-viewport-stable-height`) минус то, что лежит поверх страницы сверху; снизу —
 * больший из safe-area браузера и отступа SDK, чтобы кнопка не упиралась в полоску Home.
 */
export function sheetInsets(input: SheetInsetsInput): { maxHeight: string; paddingBottom: string } {
  const topClearance =
    input.topSafeArea > 0
      ? `${input.topSafeArea + TOP_GAP_PX}px`
      : `max(${TOP_GAP_PX}px, env(safe-area-inset-top, 0px))`;
  return {
    maxHeight: `calc(var(--tg-viewport-stable-height, 100dvh) * ${input.snap} - ${topClearance})`,
    paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${input.bottomSafeArea}px)`,
  };
}
