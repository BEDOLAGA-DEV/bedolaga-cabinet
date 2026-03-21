import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReferralNetworkStore } from '@/store/referralNetwork';
import type { NetworkGraphData } from '@/types/referralNetwork';

interface NetworkFiltersProps {
  data: NetworkGraphData;
  className?: string;
}

/**
 * @deprecated No longer used in the main page — replaced by ScopeSelector.
 * Kept for potential future reuse.
 */
export function NetworkFilters({ data, className }: NetworkFiltersProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  const filters = useReferralNetworkStore((s) => s.filters);
  const updateFilters = useReferralNetworkStore((s) => s.updateFilters);
  const resetFilters = useReferralNetworkStore((s) => s.resetFilters);
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    filters.campaigns.length > 0 || filters.partnersOnly || filters.minReferrals > 0;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, setIsOpen]);

  function toggleCampaign(campaignId: number) {
    const current = filters.campaigns;
    const next = current.includes(campaignId)
      ? current.filter((id) => id !== campaignId)
      : [...current, campaignId];
    updateFilters({ campaigns: next });
  }

  const panelContent = (
    <div className="space-y-4">
      {/* Campaigns */}
      {data.campaigns.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dark-400">
            {t('admin.referralNetwork.filters.campaigns')}
          </label>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {data.campaigns.map((campaign) => (
              <label
                key={campaign.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-dark-800/50"
              >
                <input
                  type="checkbox"
                  checked={filters.campaigns.includes(campaign.id)}
                  onChange={() => toggleCampaign(campaign.id)}
                  className="h-3.5 w-3.5 rounded border-dark-600 bg-dark-800 text-accent-500 focus:ring-accent-500/30"
                />
                <span className="truncate text-dark-200">{campaign.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Partners only */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.partnersOnly}
          onChange={(e) => updateFilters({ partnersOnly: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-dark-600 bg-dark-800 text-accent-500 focus:ring-accent-500/30"
        />
        <span className="text-dark-200">{t('admin.referralNetwork.filters.partnersOnly')}</span>
      </label>

      {/* Min referrals */}
      <div>
        <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-dark-400">
          <span>{t('admin.referralNetwork.filters.minReferrals')}</span>
          <span className="font-mono text-dark-300">{filters.minReferrals}</span>
        </label>
        <input
          type="range"
          min={0}
          max={50}
          value={filters.minReferrals}
          onChange={(e) => updateFilters({ minReferrals: Number(e.target.value) })}
          className="w-full accent-accent-500"
        />
      </div>

      {/* Reset */}
      <button
        onClick={resetFilters}
        className="w-full rounded-lg border border-dark-700/50 py-1.5 text-xs font-medium text-dark-400 transition-colors hover:border-dark-600 hover:text-dark-200"
      >
        {t('admin.referralNetwork.filters.reset')}
      </button>
    </div>
  );

  return (
    <div ref={panelRef} className={`relative shrink-0 ${className ?? ''}`}>
      {/* Trigger button — always rendered */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('admin.referralNetwork.filters.title')}
        className={`relative flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
          isOpen
            ? 'border-accent-500/50 bg-dark-800 text-dark-100'
            : 'border-dark-700/50 bg-dark-800/80 text-dark-300 hover:border-dark-600 hover:text-dark-100'
        }`}
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
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
        <span className="hidden sm:inline">{t('admin.referralNetwork.filters.title')}</span>
        {hasActiveFilters && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent-500" />
        )}
      </button>

      {/* Desktop: absolute dropdown below button */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 hidden sm:block">
          <div className="w-64 rounded-xl border border-dark-700/50 bg-dark-900/95 p-4 shadow-xl backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-dark-100">
                {t('admin.referralNetwork.filters.title')}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label={t('common.close')}
                className="text-dark-500 transition-colors hover:text-dark-300"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {panelContent}
          </div>
        </div>
      )}

      {/* Mobile: full-screen overlay */}
      {isOpen && (
        <div className="fixed inset-x-0 top-0 z-50 sm:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="relative mx-3 mt-3 rounded-xl border border-dark-700/50 bg-dark-900/95 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-dark-100">
                {t('admin.referralNetwork.filters.title')}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label={t('common.close')}
                className="rounded-lg p-1 text-dark-500 transition-colors hover:bg-dark-800 hover:text-dark-300"
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
            </div>
            {panelContent}
          </div>
        </div>
      )}
    </div>
  );
}
