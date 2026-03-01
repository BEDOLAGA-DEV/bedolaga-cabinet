import { useEffect, useRef, useState } from 'react';

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const TARGET_FPS = isMobile ? 30 : 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

/**
 * Shared animation loop hook with built-in performance safeguards:
 * - FPS throttling: 30 FPS on mobile, 60 FPS on desktop
 * - Page Visibility API: fully stops RAF when tab/app is hidden
 * - Telegram Mini App: fully stops RAF when isActive = false
 * - Auto-cleanup on unmount
 */
export function useAnimationLoop(
  callback: (time: number, delta: number) => void,
  deps: React.DependencyList,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let animId = 0;
    let lastTime = 0;
    let docHidden = document.hidden;
    let tgInactive = false;

    const isPaused = () => docHidden || tgInactive;

    const loop = (time: number) => {
      const delta = time - lastTime;
      if (delta >= FRAME_INTERVAL) {
        lastTime = time - (delta % FRAME_INTERVAL);
        callbackRef.current(time, delta);
      }
      animId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (animId) return; // already running
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    };

    const onVisibilityChange = () => {
      docHidden = document.hidden;
      if (isPaused()) stop();
      else start();
    };

    const tg = window.Telegram?.WebApp;
    const onTgActivated = () => {
      tgInactive = false;
      if (!isPaused()) start();
    };
    const onTgDeactivated = () => {
      tgInactive = true;
      stop();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (tg) {
      tg.onEvent?.('activated', onTgActivated);
      tg.onEvent?.('deactivated', onTgDeactivated);
    }

    // Start the loop (only if page is currently visible)
    if (!isPaused()) start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (tg) {
        tg.offEvent?.('activated', onTgActivated);
        tg.offEvent?.('deactivated', onTgDeactivated);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Returns whether animations should be paused (tab hidden or Telegram deactivated).
 * Use for CSS/Framer Motion components that can't use useAnimationLoop.
 */
export function useAnimationPause(): boolean {
  const [paused, setPaused] = useState(() =>
    typeof document !== 'undefined' ? document.hidden : false,
  );

  useEffect(() => {
    let docHidden = document.hidden;
    let tgInactive = false;

    const update = () => setPaused(docHidden || tgInactive);

    const onVisibility = () => {
      docHidden = document.hidden;
      update();
    };

    const tg = window.Telegram?.WebApp;
    const onActivated = () => {
      tgInactive = false;
      update();
    };
    const onDeactivated = () => {
      tgInactive = true;
      update();
    };

    document.addEventListener('visibilitychange', onVisibility);
    if (tg) {
      tg.onEvent?.('activated', onActivated);
      tg.onEvent?.('deactivated', onDeactivated);
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (tg) {
        tg.offEvent?.('activated', onActivated);
        tg.offEvent?.('deactivated', onDeactivated);
      }
    };
  }, []);

  return paused;
}

/** Returns a reduced DPR for mobile canvas rendering (saves 4x GPU work on retina) */
export function getMobileDpr(): number {
  if (isMobile) return Math.min(devicePixelRatio, 1.5);
  return devicePixelRatio || 1;
}
