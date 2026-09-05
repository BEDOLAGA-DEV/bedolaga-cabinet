import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { type Dpi, type ReachabilityStatus, reachabilityApi } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from './ChoiceChips';
import { HostsSummaryMatrix } from './HostsSummaryMatrix';
import { REACHABILITY_PATH } from './deepLink';
import { REACHABILITY_SUMMARY_KEY } from './useTargets';

export interface SummaryTabProps {
  status: ReachabilityStatus | undefined;
}

const DPI_OPTIONS: Array<{ value: Dpi; key: string }> = [
  { value: 'on', key: 'dpiOn' },
  { value: 'off', key: 'dpiOff' },
  { value: 'any', key: 'dpiAny' },
];

export function SummaryTab(_props: SummaryTabProps) {
  const { t } = useTranslation();
  const [dpi, setDpi] = useState<Dpi>('on');
  const summary = useQuery({
    queryKey: [REACHABILITY_SUMMARY_KEY, dpi],
    queryFn: () => reachabilityApi.getSummary(dpi),
    staleTime: 30_000,
  });

  const hasCells = summary.data?.rows.some((row) => Object.keys(row.cells).length > 0) ?? false;

  return (
    <div className="space-y-4">
      <ChoiceChips
        value={dpi}
        onChange={setDpi}
        label={t('admin.reachability.summary.dpiFilter')}
        showLabel
        options={DPI_OPTIONS.map((option) => ({
          value: option.value,
          label: t(`admin.reachability.units.${option.key}`),
        }))}
      />

      {summary.isLoading && (
        <SkeletonGroup aria-label={t('admin.reachability.tabs.summary')}>
          <Skeleton variant="card" className="h-48 w-full rounded-2xl" />
        </SkeletonGroup>
      )}
      {summary.isError && (
        <p className="text-sm text-error-400">{getApiErrorMessage(summary.error, '')}</p>
      )}
      {summary.data?.panel_error && (
        <p className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-dark-100">
          {t('admin.reachability.summary.panelError', { error: summary.data.panel_error })}
        </p>
      )}
      {summary.data && !hasCells && (
        <div className="rounded-2xl border border-dashed border-dark-700/60 p-6 text-center text-sm text-dark-400">
          <p>{t('admin.reachability.summary.empty')}</p>
          <Link
            to={`${REACHABILITY_PATH}?tab=probe`}
            className="mt-3 inline-block text-accent-400 hover:underline"
          >
            {t('admin.reachability.tabs.probe')}
          </Link>
        </div>
      )}
      {summary.data && hasCells && <HostsSummaryMatrix summary={summary.data} />}
    </div>
  );
}
