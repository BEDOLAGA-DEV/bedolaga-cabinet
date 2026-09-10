import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { activityApi } from '@/api/activity';
import { useAuthStore } from '@/store/auth';

/** Повтор того же пути в этом окне — не новый экран (StrictMode, перерисовки). */
const REPEAT_WINDOW_MS = 1500;

/** Экраны админки в след пользователя не попадают: действия админа пишутся в свой журнал. */
const isReportable = (pathname: string): boolean => !pathname.startsWith('/admin');

/**
 * Сообщает серверу об открытии экрана при каждой смене пути.
 * Только сам путь — без query и фрагмента, там бывают токены.
 */
export function useScreenViewReporter(): void {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const last = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isReportable(pathname)) return;
    const now = Date.now();
    if (last.current?.path === pathname && now - last.current.at < REPEAT_WINDOW_MS) return;
    last.current = { path: pathname, at: now };
    void activityApi.reportScreen(pathname);
  }, [pathname, isAuthenticated]);
}
