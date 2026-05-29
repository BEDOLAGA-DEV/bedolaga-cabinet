import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface FocusTrapOptions {
  /** Called when Escape is pressed while the trap is active. */
  onEscape?: () => void;
  /** Lock body scroll while active. Default: true. Set false if the caller already locks scroll. */
  lockScroll?: boolean;
}

/**
 * Traps keyboard focus inside a container while `active`.
 * - Moves focus into the container on activation, restores it on deactivation.
 * - Cycles Tab / Shift+Tab within the container (no escape into the page behind).
 * - Optionally closes on Escape and locks body scroll.
 *
 * Attach the returned ref to the dialog element and give it
 * `role="dialog" aria-modal="true" tabIndex={-1}`.
 *
 * @example
 * const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, { onEscape: close });
 * return <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}>...</div>;
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  options: FocusTrapOptions = {},
): RefObject<T | null> {
  const { lockScroll = true } = options;
  const containerRef = useRef<T>(null);
  // Keep the latest onEscape without re-running the effect on every render
  // (which would otherwise yank focus back to the first element repeatedly).
  const onEscapeRef = useRef(options.onEscape);
  onEscapeRef.current = options.onEscape;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.getClientRects().length > 0,
      );

    // Move focus into the dialog.
    const initial = getFocusable();
    (initial[0] ?? container).focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    let prevOverflow: string | undefined;
    if (lockScroll) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (lockScroll) {
        document.body.style.overflow = prevOverflow ?? '';
      }
      previouslyFocused?.focus?.();
    };
  }, [active, lockScroll]);

  return containerRef;
}
