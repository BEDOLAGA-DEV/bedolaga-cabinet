import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useBlockingStore } from '../../store/blocking';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { pingBackend, hasEverReachedBackend } from '../../api/health';
import { CloudWarningIcon, RestartIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { cn } from '@/lib/utils';
import BlockingShell from './BlockingShell';

const POLL_INTERVAL_MS = 5000;

/**
 * Full-screen state shown when the backend is unreachable (transport-level
 * failure), replacing the blank loader the app used to get stuck on. Polls the
 * liveness endpoint and, once the backend answers again, reloads to re-bootstrap
 * cleanly from whatever state the failed boot left behind. A manual retry button
 * lets the user force an immediate check.
 */
export default function ServiceUnavailableScreen() {
  const { t } = useTranslation();
  const clearBlocking = useBlockingStore((state) => state.clearBlocking);
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const isCheckingRef = useRef(false);

  const recover = useCallback(() => {
    clearBlocking();
    if (hasEverReachedBackend()) {
      // The app was already loaded and merely covered by this overlay — its
      // routes/forms are still mounted with their state. Lift the overlay and
      // refetch instead of a hard reload that would discard unsaved input.
      void queryClient.invalidateQueries();
    } else {
      // The initial bootstrap never reached the backend (blank loader) — reload
      // to re-bootstrap cleanly now that it is back.
      window.location.reload();
    }
  }, [clearBlocking, queryClient]);

  // Manual retry: immediate probe with a visible checking state.
  const handleRetry = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    try {
      if (await pingBackend()) {
        recover();
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [recover]);

  // Auto-recovery: probe immediately on mount, then every POLL_INTERVAL_MS.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      if (await pingBackend()) {
        if (!cancelled) recover();
      }
    };
    void tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [recover]);

  const screenRef = useFocusTrap<HTMLDivElement>(true, { lockScroll: false });

  return (
    <BlockingShell
      screenRef={screenRef}
      titleId="service-unavailable-title"
      accent="warning"
      ariaLive="polite"
      icon={<CloudWarningIcon className="h-9 w-9" />}
      title={t('blocking.serviceUnavailable.title')}
      description={t('blocking.serviceUnavailable.description')}
      pulse
      footer={t('blocking.serviceUnavailable.hint')}
      actions={
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleRetry}
          disabled={isChecking}
          leftIcon={<RestartIcon className={cn('h-5 w-5', isChecking && 'animate-spin')} />}
        >
          {isChecking
            ? t('blocking.serviceUnavailable.checking')
            : t('blocking.serviceUnavailable.retry')}
        </Button>
      }
    />
  );
}
