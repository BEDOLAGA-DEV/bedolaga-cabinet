import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ticketsApi } from '../../api/tickets';

export interface MediaItem {
  type: string;
  file_id: string;
  caption?: string | null;
}

interface MessageLike {
  has_media?: boolean;
  media_type?: string | null;
  media_file_id?: string | null;
  media_caption?: string | null;
  media_items?: MediaItem[] | null;
}

/**
 * Normalize message media into a unified list.
 * If media_items is present, use it. Otherwise fall back to legacy single-media fields.
 */
function getItems(message: MessageLike): MediaItem[] {
  if (message.media_items && message.media_items.length > 0) {
    return message.media_items;
  }
  if (message.media_file_id && message.media_type) {
    return [
      {
        type: message.media_type,
        file_id: message.media_file_id,
        caption: message.media_caption,
      },
    ];
  }
  return [];
}

export function MessageMediaGrid({
  message,
  translateError = 'Failed to load image',
}: {
  message: MessageLike;
  translateError?: string;
}) {
  const items = getItems(message);
  const photoItems = items.filter((i) => i.type === 'photo');
  const otherItems = items.filter((i) => i.type !== 'photo');

  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const openFullscreen = useCallback((idx: number) => setFullscreenIndex(idx), []);
  const closeFullscreen = useCallback(() => setFullscreenIndex(null), []);

  // Escape + arrow keys for fullscreen nav
  useEffect(() => {
    if (fullscreenIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenIndex(null);
      else if (e.key === 'ArrowLeft' && fullscreenIndex > 0)
        setFullscreenIndex(fullscreenIndex - 1);
      else if (e.key === 'ArrowRight' && fullscreenIndex < photoItems.length - 1)
        setFullscreenIndex(fullscreenIndex + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenIndex, photoItems.length]);

  // Lock body scroll while fullscreen overlay is open (mobile mainly).
  useEffect(() => {
    if (fullscreenIndex === null) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreenIndex]);

  // All hooks have been called — safe to early-return now.
  if (items.length === 0) return null;

  // Grid layout based on photo count
  let gridClass = '';
  if (photoItems.length === 1) {
    gridClass = 'grid-cols-1';
  } else if (photoItems.length === 2) {
    gridClass = 'grid-cols-2';
  } else if (photoItems.length === 3) {
    gridClass = 'grid-cols-3';
  } else {
    gridClass = 'grid-cols-2'; // 4+ → 2x2
  }

  const visiblePhotos = photoItems.slice(0, 4);
  const hiddenCount = photoItems.length - visiblePhotos.length;

  return (
    <div className="mt-3 space-y-2">
      {photoItems.length > 0 && (
        <div className={`grid gap-1 ${gridClass}`}>
          {visiblePhotos.map((item, visIdx) => {
            // visIdx is always the correct index into photoItems (visible prefix)
            const originalIdx = visIdx;
            const isLastVisible = visIdx === visiblePhotos.length - 1 && hiddenCount > 0;
            return (
              <button
                key={`${item.file_id}-${visIdx}`}
                type="button"
                className="group relative aspect-square overflow-hidden rounded-lg bg-dark-800"
                onClick={() => openFullscreen(originalIdx)}
              >
                <img
                  src={ticketsApi.getMediaUrl(item.file_id)}
                  alt={item.caption || 'Attached photo'}
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  loading="lazy"
                />
                {isLastVisible && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-semibold text-white">
                    +{hiddenCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Non-photo media rendered inline */}
      {otherItems.map((item) => {
        const mediaUrl = ticketsApi.getMediaUrl(item.file_id);
        if (item.type === 'video') {
          return (
            <div key={item.file_id}>
              <video
                src={mediaUrl}
                controls
                className="max-h-64 max-w-full rounded-lg"
                preload="metadata"
              />
              {item.caption && <p className="mt-1 text-xs text-dark-400">{item.caption}</p>}
            </div>
          );
        }
        return (
          <a
            key={item.file_id}
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-dark-700 px-3 py-2 text-sm text-dark-200 transition-colors hover:bg-dark-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            {item.caption || `Download ${item.type}`}
          </a>
        );
      })}

      {fullscreenIndex !== null &&
        photoItems[fullscreenIndex] &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black"
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition-colors hover:bg-gray-200"
              onClick={closeFullscreen}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {photoItems.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={fullscreenIndex === 0}
                  onClick={() => setFullscreenIndex(fullscreenIndex - 1)}
                  className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-colors hover:bg-white disabled:opacity-30"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={fullscreenIndex >= photoItems.length - 1}
                  onClick={() => setFullscreenIndex(fullscreenIndex + 1)}
                  className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-colors hover:bg-white disabled:opacity-30"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-sm text-white">
                  {fullscreenIndex + 1} / {photoItems.length}
                </div>
              </>
            )}

            <div
              className="flex h-full w-full items-center justify-center overflow-auto"
              onClick={closeFullscreen}
            >
              <img
                src={ticketsApi.getMediaUrl(photoItems[fullscreenIndex].file_id)}
                alt={photoItems[fullscreenIndex].caption || 'Attached photo'}
                className="max-h-full max-w-full object-contain"
                style={{ touchAction: 'pinch-zoom' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>,
          document.body,
        )}

      {/* Fallback: error state */}
      {photoItems.length === 0 && otherItems.length === 0 && (
        <div className="text-xs text-dark-400">{translateError}</div>
      )}
    </div>
  );
}
