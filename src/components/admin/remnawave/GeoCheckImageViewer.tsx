import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { MinusIcon, PlusIcon, ResetIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Ширина в CSS-пикселях, при которой моноширинный отчёт ещё читается.
 * Отчёт всегда заметно шире телефона, поэтому «вписать по ширине» на узком
 * экране превращает его в серую рябь. Стартуем с масштаба, дающего примерно
 * такую ширину, а вписать целиком всегда можно кнопкой сброса и жестом.
 */
const READABLE_WIDTH = 760;

/** Масштаб 1 — отчёт вписан в ширину области; ниже опускаться незачем. */
/** Ширины строк-заглушек, повторяющие ритм отчёта: заголовок, строки, пробел. */
const SKELETON_ROWS = [42, 88, 80, 84, 30, 70, 76, 82, 64, 28, 86, 74, 80, 68];

const SCALE_MIN = 1;
const SCALE_MAX = 8;

interface GeoCheckImageViewerProps {
  src: string;
  alt: string;
  /** Смена режима меняет доступную ширину — просмотрщик пересобирается. */
  fullscreen: boolean;
}

/**
 * Просмотр широкого SVG-отчёта: зум, перетаскивание, пинч, двойной тап.
 *
 * Зум свой, а не браузерный: в `index.html` приложения стоит
 * `user-scalable=no`, поэтому нативного пинча нет ни в мобильном вебе, ни в
 * Mini App. Библиотека берёт на себя все жесты и работает одинаково от мыши,
 * пальца и трекпада — так же это сделано в самой панели Remnawave.
 *
 * Колесо намеренно не масштабирует (`wheelDisabled`): иначе обычная прокрутка
 * над отчётом превращалась бы в зум.
 */
export function GeoCheckImageViewer({ src, alt, fullscreen }: GeoCheckImageViewerProps) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Отчёт весит сотни килобайт вместе со встроенным шрифтом, и между приходом
  // данных и первой отрисовкой есть заметная пауза. До неё показываем
  // скелетон, а не пустую тёмную коробку с кнопками зума.
  //
  // Готовность хранится как «какая картинка отрисована», а не флагом: тогда
  // новый отчёт автоматически считается незагруженным, без сбрасывающего
  // эффекта.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;

  // Подпись отчёта для ключа. Длины и хвоста base64 недостаточно: отчёты
  // одного узла кончаются одинаково и совпали бы по такой подписи, а зум
  // тогда не сбрасывается. Полная строка в ключе — сотни килобайт на каждый
  // рендер, поэтому считаем хеш один раз на отчёт.
  const srcId = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < src.length; i += 1) {
      hash = (hash * 31 + src.charCodeAt(i)) | 0;
    }
    return `${src.length}:${hash}`;
  }, [src]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(host);
    setWidth(host.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Масштаб 1 = вписано по ширине. На широком экране этого достаточно, на
  // узком — поднимаем до читаемого и позволяем панорамировать.
  const initialScale = width > 0 ? Math.min(SCALE_MAX, Math.max(1, READABLE_WIDTH / width)) : 1;

  const controlButton =
    'flex h-9 w-9 items-center justify-center rounded-lg text-dark-200 transition-colors hover:bg-dark-100/10 active:scale-95';

  return (
    <div ref={hostRef} className="relative h-full">
      {!loaded && (
        <div
          className="absolute inset-0 z-10 space-y-2 p-4"
          role="status"
          aria-busy="true"
          aria-label={t('common.loading')}
        >
          {SKELETON_ROWS.map((w) => (
            <Skeleton key={w} className="h-3" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
      {width > 0 && (
        <TransformWrapper
          // Пересобираем, когда меняется нужный стартовый масштаб: полный экран,
          // поворот телефона, разворот окна. Ключ огрублён до десятых — пока
          // отчёт и так вписывается (масштаб 1), перетаскивание окна мышью
          // ничего не сбрасывает.
          // `src` в ключе: перезапуск проверки даёт новый отчёт, и он должен
          // открыться в исходном масштабе, а не унаследовать зум и сдвиг от
          // предыдущего.
          key={`${srcId}-${fullscreen}-${Math.round(initialScale * 10)}`}
          centerOnInit={false}
          disablePadding
          doubleClick={{ mode: 'toggle' }}
          initialScale={initialScale}
          maxScale={SCALE_MAX}
          minScale={SCALE_MIN}
          trackPadPanning={{ disabled: false }}
          wheel={{ wheelDisabled: true }}
        >
          {({ resetTransform, zoomIn, zoomOut }) => (
            <>
              <TransformComponent
                contentStyle={{ width: '100%' }}
                // touch-action: none — все жесты обрабатывает библиотека,
                // иначе браузер перехватит их под прокрутку.
                wrapperClass="!h-full !w-full cursor-grab touch-none active:cursor-grabbing"
              >
                <img
                  alt={alt}
                  className="block w-full select-none"
                  draggable={false}
                  src={src}
                  onLoad={() => setLoadedSrc(src)}
                  onError={() => setLoadedSrc(src)}
                />
              </TransformComponent>

              {loaded && (
                <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-xl border border-dark-100/10 bg-dark-950/70 p-1 shadow-lg backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => zoomOut()}
                    className={controlButton}
                    aria-label={t('admin.remnawave.geoCheck.zoomOut', 'Zoom out')}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomIn()}
                    className={controlButton}
                    aria-label={t('admin.remnawave.geoCheck.zoomIn', 'Zoom in')}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  <span aria-hidden className="mx-0.5 h-5 w-px bg-dark-100/15" />
                  <button
                    type="button"
                    onClick={() => resetTransform()}
                    className={controlButton}
                    aria-label={t('admin.remnawave.geoCheck.zoomReset', 'Reset zoom')}
                  >
                    <ResetIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </TransformWrapper>
      )}
    </div>
  );
}
