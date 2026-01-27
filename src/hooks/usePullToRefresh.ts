import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh?: () => void | Promise<void>;
  threshold?: number; // How far to pull before triggering refresh (px)
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions = {}) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // Default: reload the page
      window.location.reload();
    }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    // Check if a modal/overlay is currently open
    const isModalOpen = (): boolean => {
      // Check if body scroll is locked (common pattern for modals)
      if (document.body.style.overflow === 'hidden') return true;
      // Check for high z-index fixed elements (modals typically use z-index > 50)
      const fixedElements = document.querySelectorAll(
        '[style*="position: fixed"], [style*="position:fixed"]',
      );
      for (const el of fixedElements) {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex, 10);
        if (zIndex >= 50 && el.clientHeight > window.innerHeight * 0.5) {
          return true;
        }
      }
      return false;
    };

    // Check if element or any parent is scrollable and not at top
    const isInsideScrollableContainer = (element: HTMLElement | null): boolean => {
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;
        const isScrollable = overflowY === 'auto' || overflowY === 'scroll';

        if (isScrollable && element.scrollHeight > element.clientHeight) {
          // Element is scrollable - check if it's at the top
          if (element.scrollTop > 0) {
            return true; // Not at top, don't trigger pull-to-refresh
          }
        }
        element = element.parentElement;
      }
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Don't trigger if a modal is open
      if (isModalOpen()) return;

      // Only trigger if at top of page
      if (window.scrollY > 5) return;

      // Don't trigger if touch started inside a scrollable container that's not at top
      const target = e.target as HTMLElement;
      if (isInsideScrollableContainer(target)) return;

      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === 0) return;

      // Cancel if modal opened during gesture
      if (isModalOpen()) {
        startY.current = 0;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      if (window.scrollY > 5) {
        // User scrolled down, reset
        startY.current = 0;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      // Also check during move - user might start at top then scroll inside container
      const target = e.target as HTMLElement;
      if (isInsideScrollableContainer(target)) {
        startY.current = 0;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only track downward pulls
      if (diff > 0) {
        // Apply resistance - pull distance is less than actual finger movement
        const resistance = 0.4;
        const distance = Math.min(diff * resistance, threshold * 1.5);
        setPullDistance(distance);
        setIsPulling(true);

        // Prevent default scroll if we're pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh();
      }

      startY.current = 0;
      setPullDistance(0);
      setIsPulling(false);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, threshold, pullDistance, isRefreshing, handleRefresh]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    progress: Math.min(pullDistance / threshold, 1),
  };
}
