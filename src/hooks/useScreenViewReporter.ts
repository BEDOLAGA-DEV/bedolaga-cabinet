import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useAuthStore } from '@/store/auth';
import { installClickTracker, trackScreen } from '@/utils/activityTracker';

/**
 * След пользователя: каждый открытый экран и каждое нажатие уходят в
 * «Активность» его карточки. Только путь — без query и фрагмента, там бывают токены.
 */
export function useScreenViewReporter(): void {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const current = useRef(pathname);
  current.current = pathname;

  useEffect(() => {
    if (!isAuthenticated) return;
    trackScreen(pathname);
  }, [pathname, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return installClickTracker(() => current.current);
  }, [isAuthenticated]);
}
