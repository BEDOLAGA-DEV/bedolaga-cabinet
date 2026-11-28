import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { subscriptionApi } from '@/api/subscription';
import { useSubscriptionMirror } from '@/hooks/useSubscriptionMirror';
import { MirrorSelector } from '@/components/connection/MirrorSelector';
import { resolveConnectionUrlForUi } from '@/utils/connectionLink';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useBranding } from '../hooks/useBranding';
import { AdminBackButton } from '@/components/admin';
import { CopyIcon, CheckIcon } from '@/components/icons';
import { copyToClipboard } from '@/utils/clipboard';

interface ConnectionQRState {
  refreshConnection?: boolean;
  url: string;
  hideLink: boolean;
  subscriptionId?: number;
}

function isValidState(state: unknown): state is ConnectionQRState {
  if (!state || typeof state !== 'object') return false;
  const s = state as Record<string, unknown>;
  return typeof s.url === 'string' && s.url.length > 0 && typeof s.hideLink === 'boolean';
}

export default function ConnectionQR() {
  const userId = useAuthStore((state) => state.user?.id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { appName } = useBranding();
  const [copyResult, setCopyResult] = useState<{
    url: string;
    status: 'copying' | 'copied' | 'error';
  } | null>(null);

  const state = location.state as unknown;
  const routeState = isValidState(state) ? state : null;
  const needsRefresh = Boolean(routeState?.refreshConnection && routeState.subscriptionId);
  const subscriptionId = routeState?.subscriptionId;
  const {
    data: fresh,
    isFetching,
    isFetchedAfterMount,
    isError,
  } = useQuery({
    queryKey: ['connectionLink', subscriptionId, userId],
    queryFn: () => subscriptionApi.getConnectionLink(subscriptionId),
    enabled: needsRefresh,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const data =
    !isFetching && isFetchedAfterMount && fresh?.subscription_id === subscriptionId
      ? fresh
      : undefined;
  const publicUrl = data
    ? resolveConnectionUrlForUi({
        mode: data.connect_mode,
        subscriptionUrl: data.subscription_url,
        displayLink: data.display_link,
        happSchemeLink: data.happ_scheme_link,
        happCryptLink: data.happ_cryptolink,
        happCryptoLink: data.happ_crypto_link,
        happLink: data.happ_link,
      })
    : null;
  // Hidden links remain usable as QR codes. Fetch the same owned subscription's
  // app config afresh; never fall back to a token from history or cached config.
  const needsHiddenConfig = Boolean(data?.hide_link && !publicUrl);
  const hiddenConfig = useQuery({
    queryKey: ['appConfig', subscriptionId, userId],
    queryFn: () => subscriptionApi.getAppConfig(subscriptionId),
    enabled: needsRefresh && needsHiddenConfig,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const awaitingHiddenConfig =
    needsHiddenConfig &&
    !hiddenConfig.isError &&
    (hiddenConfig.isFetching || !hiddenConfig.isFetchedAfterMount);
  const fallbackUrl =
    needsHiddenConfig &&
    !awaitingHiddenConfig &&
    !hiddenConfig.isError &&
    hiddenConfig.data?.hasSubscription
      ? resolveConnectionUrlForUi({
          mode: data?.connect_mode,
          fallbackUrl: hiddenConfig.data.subscriptionUrl,
        })
      : null;
  const main = needsRefresh ? (publicUrl ?? fallbackUrl) : (routeState?.url ?? null);
  const mirrorSelection = useSubscriptionMirror(data, main);
  const validState = needsRefresh
    ? data && mirrorSelection.url && !awaitingHiddenConfig
      ? { url: mirrorSelection.url, hideLink: data.hide_link, subscriptionId }
      : null
    : routeState;
  useEffect(() => {
    if (
      needsRefresh &&
      !isFetching &&
      (isError ||
        (isFetchedAfterMount &&
          (fresh?.subscription_id !== subscriptionId ||
            (!awaitingHiddenConfig && !mirrorSelection.url))))
    )
      navigate(`/connection?sub=${subscriptionId}`, { replace: true });
  }, [
    needsRefresh,
    isFetching,
    isError,
    isFetchedAfterMount,
    fresh?.subscription_id,
    subscriptionId,
    awaitingHiddenConfig,
    mirrorSelection.url,
    navigate,
  ]);
  const copyStatus = copyResult?.url === validState?.url ? copyResult?.status : undefined;
  const handleCopy = async () => {
    if (!validState || validState.hideLink) return;
    const url = validState.url;
    setCopyResult({ url, status: 'copying' });
    try {
      await copyToClipboard(url);
      setCopyResult({ url, status: 'copied' });
    } catch {
      setCopyResult({ url, status: 'error' });
    }
  };
  const subId = validState?.subscriptionId;
  const connectionPath = subId ? `/connection?sub=${subId}` : '/connection';

  useEffect(() => {
    if (!routeState) {
      navigate(connectionPath, { replace: true });
    }
  }, [routeState, navigate, connectionPath]);

  if (!validState) {
    if (!needsRefresh) return null;
    return (
      <SkeletonGroup className="flex flex-col items-center gap-6 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" className="h-72 w-72" />
        <Skeleton className="h-10 w-64" />
      </SkeletonGroup>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to={connectionPath} replace />
        <h1 className="text-2xl font-bold text-dark-100">{t('subscription.connection.qrTitle')}</h1>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex w-full max-w-sm flex-col items-center px-6">
          {appName && (
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
              {appName}
            </p>
          )}

          <p className="mb-8 text-center text-sm text-dark-400">
            {t('subscription.connection.qrScanHint')}
          </p>

          <MirrorSelector selection={mirrorSelection} />
          <div className="rounded-3xl bg-white p-6">
            <QRCodeSVG
              value={validState.url}
              size={280}
              level="M"
              includeMargin={false}
              className="h-[280px] w-[280px] sm:h-[360px] sm:w-[360px]"
            />
          </div>

          {!validState.hideLink && (
            <div className="mt-6 w-full min-w-0 space-y-3">
              <p
                dir="ltr"
                className="select-text break-all whitespace-normal text-left font-mono text-xs text-dark-400"
              >
                {validState.url}
              </p>
              <button
                type="button"
                className="btn-secondary inline-flex w-full items-center justify-center gap-2"
                disabled={copyStatus === 'copying'}
                onClick={handleCopy}
              >
                {copyStatus === 'copied' ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
                <span aria-live="polite">
                  {copyStatus === 'copied'
                    ? t('common.copied')
                    : t('subscription.connection.copyLink')}
                </span>
              </button>
              {copyStatus === 'error' && (
                <p role="alert" className="text-sm text-error-400">
                  {t('subscription.connection.copyFailed')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
