import { useEffect, useRef, useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from '@/components/icons';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import { useHaptic } from '@/platform';
import { sheetInsets } from './sheetInsets';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Snap points as fractions of viewport height (0-1)
   * @default [1] - Full height
   */
  snapPoints?: number[];
  /**
   * Initial snap point index
   * @default 0
   */
  initialSnap?: number;
  /**
   * Whether to close when dragged below threshold
   * @default true
   */
  closeOnDragDown?: boolean;
  /**
   * Threshold to close (fraction of sheet height)
   * @default 0.3
   */
  closeThreshold?: number;
  /**
   * Whether to show drag handle
   * @default true
   */
  showHandle?: boolean;
  /**
   * Whether backdrop click closes sheet
   * @default true
   */
  closeOnBackdropClick?: boolean;
  /**
   * Whether Escape key closes sheet
   * @default true
   */
  closeOnEscape?: boolean;
  /**
   * Custom class for the sheet container
   */
  className?: string;
  /**
   * Custom class for the content area
   */
  contentClassName?: string;
  /**
   * Title shown in the header
   */
  title?: string;
  /**
   * Children content
   */
  children: ReactNode;
}

interface DragState {
  startY: number;
  currentY: number;
  startHeight: number;
  isDragging: boolean;
  velocity: number;
  lastY: number;
  lastTime: number;
}

const VELOCITY_THRESHOLD = 0.5; // px/ms - fast swipe closes regardless of position
const ANIMATION_DURATION = 300;

export function Sheet({
  isOpen,
  onClose,
  snapPoints = [1],
  initialSnap = 0,
  closeOnDragDown = true,
  closeThreshold = 0.3,
  showHandle = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  contentClassName = '',
  title,
  children,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState>({
    startY: 0,
    currentY: 0,
    startHeight: 0,
    isDragging: false,
    velocity: 0,
    lastY: 0,
    lastTime: 0,
  });

  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const [isAnimating, setIsAnimating] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const haptic = useHaptic();
  const { t } = useTranslation();
  // В fullscreen Mini App поверх страницы лежат шапка Telegram и полоска Home:
  // высота шита считается без них, иначе заголовок уходит под кнопки «Назад / ⌄ …».
  const { topSafeArea, bottomSafeArea } = useHeaderHeight();
  const insets = sheetInsets({ snap: snapPoints[currentSnapIndex], topSafeArea, bottomSafeArea });

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Animation on open/close
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure portal is mounted
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Find closest snap point
  const findClosestSnap = useCallback(
    (currentTranslate: number, velocity: number): number => {
      const viewportHeight = window.innerHeight;
      const sheetHeight = sheetRef.current?.offsetHeight ?? viewportHeight;

      // If velocity is high enough, snap in direction of movement
      if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
        if (velocity > 0) {
          // Swiping down - go to lower snap or close
          if (closeOnDragDown && currentTranslate > sheetHeight * 0.1) {
            return -1; // Close
          }
          return Math.min(currentSnapIndex + 1, snapPoints.length - 1);
        } else {
          // Swiping up - go to higher snap
          return Math.max(currentSnapIndex - 1, 0);
        }
      }

      // Otherwise, find closest snap based on position
      const currentPosition = currentTranslate / viewportHeight;

      // Check if should close
      if (closeOnDragDown && currentPosition > closeThreshold) {
        return -1; // Close
      }

      // Find closest snap point
      let closestIndex = currentSnapIndex;
      let minDistance = Infinity;

      snapPoints.forEach((snap, index) => {
        const snapPosition = (1 - snap) * viewportHeight;
        const distance = Math.abs(currentTranslate - snapPosition);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    },
    [currentSnapIndex, snapPoints, closeOnDragDown, closeThreshold],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (clientY: number) => {
      if (isAnimating) return;

      const state = dragState.current;
      state.startY = clientY;
      state.currentY = clientY;
      state.startHeight = sheetRef.current?.offsetHeight ?? 0;
      state.isDragging = true;
      state.velocity = 0;
      state.lastY = clientY;
      state.lastTime = Date.now();
    },
    [isAnimating],
  );

  // Handle drag move
  const handleDragMove = useCallback((clientY: number) => {
    const state = dragState.current;
    if (!state.isDragging) return;

    const deltaY = clientY - state.startY;
    const now = Date.now();
    const timeDelta = now - state.lastTime;

    // Calculate velocity
    if (timeDelta > 0) {
      state.velocity = (clientY - state.lastY) / timeDelta;
    }

    state.lastY = clientY;
    state.lastTime = now;
    state.currentY = clientY;

    // Only allow dragging down (positive translateY)
    const newTranslateY = Math.max(0, deltaY);
    setTranslateY(newTranslateY);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    const state = dragState.current;
    if (!state.isDragging) return;

    state.isDragging = false;
    setIsAnimating(true);

    const targetSnap = findClosestSnap(translateY, state.velocity);

    if (targetSnap === -1) {
      // Close the sheet
      haptic.notification('warning');
      setTranslateY(window.innerHeight);
      setTimeout(() => {
        onClose();
        setTranslateY(0);
        setIsAnimating(false);
      }, ANIMATION_DURATION);
    } else {
      // Snap to position
      if (targetSnap !== currentSnapIndex) {
        haptic.impact('light');
      }
      setCurrentSnapIndex(targetSnap);
      setTranslateY(0);
      setTimeout(() => {
        setIsAnimating(false);
      }, ANIMATION_DURATION);
    }
  }, [translateY, findClosestSnap, currentSnapIndex, haptic, onClose]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY);
    },
    [handleDragStart],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0].clientY);
    },
    [handleDragMove],
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for desktop)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleDragStart(e.clientY);

      const handleMouseMove = (e: MouseEvent) => {
        handleDragMove(e.clientY);
      };

      const handleMouseUp = () => {
        handleDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleDragStart, handleDragMove, handleDragEnd],
  );

  // Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        haptic.impact('light');
        onClose();
      }
    },
    [closeOnBackdropClick, haptic, onClose],
  );

  if (!isOpen) return null;

  const sheet = (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-dark-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-dark-900 shadow-2xl ${
          isAnimating ? 'transition-transform duration-300 ease-out' : ''
        } ${isVisible ? 'translate-y-0' : 'translate-y-full'} ${className}`}
        style={{
          maxHeight: insets.maxHeight,
          transform: `translateY(${isVisible ? translateY : '100%'}px)`,
          paddingBottom: insets.paddingBottom,
        }}
      >
        {/* Drag handle area */}
        {showHandle && (
          <div
            className="flex shrink-0 cursor-grab touch-none items-center justify-center py-3 active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            <div className="h-1 w-10 rounded-full bg-dark-600" />
          </div>
        )}

        {/* Title + close: жест не единственный способ закрыть полноэкранный шит */}
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-dark-700/50 pb-3 pl-6 pr-3">
            <h2 className="min-w-0 truncate text-lg font-semibold text-dark-100">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close', 'Закрыть')}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}

// Light theme styles applied via CSS
// Add to globals.css:
// .light .sheet-backdrop { @apply bg-dark-950/40; }
// .light .sheet-container { @apply bg-champagne-100; }
