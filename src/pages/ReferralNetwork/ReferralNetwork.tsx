import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { referralNetworkApi } from '@/api/referralNetwork';
import { useReferralNetworkStore } from '@/store/referralNetwork';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import { AdminBackButton } from '@/components/admin/AdminBackButton';
import { NetworkGraph } from './components/NetworkGraph';
import { ScopeSelector } from './components/ScopeSelector';
import { UserDetailPanel } from './components/UserDetailPanel';
import { CampaignDetailPanel } from './components/CampaignDetailPanel';
import { NetworkStats } from './components/NetworkStats';
import { NetworkLegend } from './components/NetworkLegend';
import { NetworkControls } from './components/NetworkControls';

export function ReferralNetwork() {
  const { t } = useTranslation();
  const selectedNode = useReferralNetworkStore((s) => s.selectedNode);
  const scope = useReferralNetworkStore((s) => s.scope);
  const addScope = useReferralNetworkStore((s) => s.addScope);
  const removeScope = useReferralNetworkStore((s) => s.removeScope);
  const clearScope = useReferralNetworkStore((s) => s.clearScope);

  const { mobile: mobileHeaderHeight, bottomSafeArea } = useHeaderHeight();

  const hasScope = scope.length > 0;

  const {
    data: networkData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['referral-network', 'scoped', scope.map((s) => `${s.type}:${s.id}`).sort()],
    queryFn: () => referralNetworkApi.getScopedGraph(scope),
    enabled: hasScope,
    staleTime: 120_000,
  });

  const isPanelOpen = selectedNode !== null;

  return createPortal(
    <div
      id="referral-network-container"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-rows-[auto_1fr] bg-[#0a0a0f] lg:!top-14"
      style={
        {
          top: mobileHeaderHeight,
          '--safe-bottom': `${bottomSafeArea}px`,
        } as React.CSSProperties
      }
    >
      <div className="z-20 border-b border-dark-700/50 bg-dark-900/90 backdrop-blur-md">
        {/* Mobile: two rows — title on top, selector below */}
        <div className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <AdminBackButton />
            <h1 className="shrink-0 text-sm font-bold text-dark-100 sm:text-base">
              {t('admin.referralNetwork.title')}
            </h1>
          </div>
          <ScopeSelector
            value={scope}
            onAdd={addScope}
            onRemove={removeScope}
            onClear={clearScope}
            className="min-w-0 flex-1 sm:max-w-xl"
          />
        </div>
      </div>

      <div className="relative overflow-hidden">
        {/* Empty state: no scope selected */}
        {!hasScope && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12 text-dark-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
              <p className="max-w-xs text-sm text-dark-500">
                {t('admin.referralNetwork.scope.emptyState')}
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {hasScope && isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-accent-400" />
              <p className="text-sm text-dark-400">{t('admin.referralNetwork.loading')}</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {hasScope && isError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <p className="text-sm text-error-400">{t('admin.referralNetwork.error')}</p>
          </div>
        )}

        {/* Empty data */}
        {hasScope &&
          networkData &&
          networkData.users.length === 0 &&
          networkData.campaigns.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <p className="text-sm text-dark-500">{t('admin.referralNetwork.empty')}</p>
            </div>
          )}

        {/* Graph + overlays */}
        {hasScope &&
          networkData &&
          (networkData.users.length > 0 || networkData.campaigns.length > 0) && (
            <>
              <NetworkGraph data={networkData} className="absolute inset-0 h-full w-full" />

              <div className="absolute bottom-[calc(12px+var(--safe-bottom,0px))] left-3 z-10 sm:bottom-4 sm:left-4">
                <NetworkStats data={networkData} />
              </div>

              <div className="absolute bottom-[calc(12px+var(--safe-bottom,0px))] right-3 z-10 hidden sm:bottom-4 sm:right-4 sm:block">
                <NetworkLegend />
              </div>

              <div className="absolute bottom-[calc(12px+var(--safe-bottom,0px))] left-1/2 z-10 -translate-x-1/2 sm:bottom-4">
                <NetworkControls />
              </div>
            </>
          )}

        {/* Detail panel (slide-in from right) */}
        <div
          className={`absolute right-0 top-0 z-30 flex h-full w-full flex-col border-l border-dark-700/50 bg-dark-900/95 backdrop-blur-md transition-transform duration-300 ease-in-out sm:w-[400px] ${
            isPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selectedNode?.type === 'user' && (
            <UserDetailPanel
              userId={selectedNode.id}
              className="flex flex-1 flex-col overflow-hidden"
            />
          )}
          {selectedNode?.type === 'campaign' && (
            <CampaignDetailPanel
              campaignId={selectedNode.id}
              className="flex flex-1 flex-col overflow-hidden"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
