import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Dpi, reachabilityApi } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from './ChoiceChips';
import { HostsSummaryMatrix } from './HostsSummaryMatrix';
import { lastCheckedAt } from './lastChecked';
import { relativeAge } from './relativeAge';
import { REACHABILITY_SUMMARY_KEY } from './useTargets';

function useSummary(dpi: Dpi) {
  return useQuery({
    queryKey: [REACHABILITY_SUMMARY_KEY, dpi],
    queryFn: () => reachabilityApi.getSummary(dpi),
    staleTime: 30_000,
  });
}

/**
 * Вход в матрицу последних проверок: заголовок, давность, кнопка. Счётчиков «N из M в норме»
 * здесь нет — одна режущаяся симка делала хост «с проблемой» и только смущала.
 */
export function HostsHealthStrip() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dpi, setDpi] = useState<Dpi>('on');
  const primary = useSummary('on');
  const expanded = useSummary(dpi);

  if (primary.isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.health.title')}>
        <Skeleton className="h-6 w-72" />
      </SkeletonGroup>
    );
  }
  if (primary.isError) {
    return <p className="text-sm text-error-400">{getApiErrorMessage(primary.error, '')}</p>;
  }
  if (!primary.data) return null;

  const checkedAt = lastCheckedAt(primary.data);
  const hasHosts = primary.data.rows.length > 0;

  return (
    <section aria-labelledby="reachability-health" className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="reachability-health" className="text-sm font-medium text-dark-300">
          {t('admin.reachability.health.title')}
        </h2>
        {!hasHosts && (
          <span className="text-sm text-dark-400">{t('admin.reachability.health.none')}</span>
        )}
        {hasHosts && checkedAt === null && (
          <span className="text-sm text-dark-400">{t('admin.reachability.health.empty')}</span>
        )}
        {checkedAt !== null && (
          <span className="text-xs text-dark-400">
            {t('admin.reachability.health.checked', { age: relativeAge(checkedAt, i18n.language) })}
          </span>
        )}
        {checkedAt !== null && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="ml-auto text-sm text-accent-400 hover:underline"
          >
            {t(
              open
                ? 'admin.reachability.health.hideMatrix'
                : 'admin.reachability.health.showMatrix',
            )}
          </button>
        )}
      </div>
      {primary.data.panel_error && (
        <p className="text-xs text-warning-400">
          {t('admin.reachability.summary.panelError', { error: primary.data.panel_error })}
        </p>
      )}
      {open && (
        <div className="space-y-3">
          <ChoiceChips
            value={dpi}
            onChange={setDpi}
            label={t('admin.reachability.summary.dpiFilter')}
            showLabel
            options={[
              { value: 'on', label: t('admin.reachability.units.dpiOn') },
              { value: 'off', label: t('admin.reachability.units.dpiOff') },
              { value: 'any', label: t('admin.reachability.units.dpiAny') },
            ]}
          />
          {expanded.data && <HostsSummaryMatrix summary={expanded.data} />}
        </div>
      )}
    </section>
  );
}
