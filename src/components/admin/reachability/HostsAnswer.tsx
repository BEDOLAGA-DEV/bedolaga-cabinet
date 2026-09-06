import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Dpi, Job, ReachabilityStatus } from '@/api/reachability';
import { Button } from '@/components/primitives';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from './ChoiceChips';
import { HostsSummaryMatrix } from './HostsSummaryMatrix';
import { LaunchConfirm } from './LaunchConfirm';
import { type HostAnswer, defaultProbeSet, hostAnswers } from './answerSummary';
import { buildProbeBody } from './jobBodies';
import { lastCheckedAt } from './lastChecked';
import { formatList } from './launchSummary';
import { formatCredits } from './money';
import { relativeAge } from './relativeAge';
import { DEFAULT_SNI_HOST, parseSniHosts, recallSniHosts } from './sniNames';
import { unitNameList } from './unitLabel';
import { useLaunch } from './useLaunch';
import { useSummary } from './useTargets';
import { useUnits } from './useUnits';

const PROBES = { icmp: false, tcp: true, sni: true } as const;
const LISTED = 4;

interface HostsAnswerProps {
  status: ReachabilityStatus | undefined;
  runningJobId: number | null;
  onRunning: (jobId: number | null) => void;
}

function tone(answer: HostAnswer): string {
  if (answer.total === 0) return 'text-dark-400';
  if (answer.ok === answer.total) return 'text-success-400';
  if (answer.ok === 0) return 'text-error-400';
  return 'text-warning-400';
}

/**
 * Первый экран: по одному предложению на хост («открывается у 11 из 15 симок с Белым списком»,
 * кто режет, когда проверяли), кнопка «Проверить снова» с ценой и вторым шагом на месте,
 * «Подробнее» раскрывает матрицу. Никаких счётчиков «N из M в норме».
 */
export function HostsAnswer({ status, runningJobId, onRunning }: HostsAnswerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dpi, setDpi] = useState<Dpi>('on');
  const primary = useSummary('any');
  const expanded = useSummary(dpi);
  const { data: catalog = [] } = useUnits();

  const answers = useMemo(() => (primary.data ? hostAnswers(primary.data) : []), [primary.data]);
  const body = useMemo(() => {
    if (!primary.data || catalog.length === 0) return null;
    const set = defaultProbeSet(primary.data, catalog);
    if (set.hosts.length === 0) return null;
    const sni = parseSniHosts(recallSniHosts() ?? status?.default_sni ?? DEFAULT_SNI_HOST).names;
    return buildProbeBody({
      hosts: set.hosts,
      nodes: [],
      custom: [],
      units: set.units,
      dpi: set.dpi,
      probes: { ...PROBES },
      sniHosts: sni,
    });
  }, [primary.data, catalog, status?.default_sni]);
  const launch = useLaunch(body, status, (job: Job) => onRunning(job.id));

  if (primary.isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.answer.title')}>
        <Skeleton className="h-5 w-80" />
        <Skeleton className="mt-2 h-10 w-56 rounded-lg" />
      </SkeletonGroup>
    );
  }
  if (primary.isError) {
    return <p className="text-sm text-error-400">{getApiErrorMessage(primary.error, '')}</p>;
  }
  if (!primary.data) return null;

  const checkedAt = lastCheckedAt(primary.data);
  const anyChecked = answers.some((answer) => answer.total > 0);
  const more = (count: number) => t('admin.reachability.launch.confirmMore', { count });
  const price = launch.cost === null ? null : formatCredits(launch.cost);
  const running = runningJobId !== null;

  return (
    <section aria-label={t('admin.reachability.answer.title')} className="space-y-3">
      {answers.length === 0 ? (
        <p className="text-sm text-dark-400">{t('admin.reachability.health.none')}</p>
      ) : (
        <ul className="space-y-2">
          {answers.map((answer) => (
            <li key={answer.targetKey} className="text-sm">
              <span className="font-medium text-dark-100">{answer.label}</span>
              <span className="text-dark-400">: </span>
              <span className={cn('font-medium', tone(answer))}>
                {answer.total === 0
                  ? t('admin.reachability.answer.unchecked')
                  : t(`admin.reachability.answer.${answer.purpose === 'bs' ? 'bs' : 'regular'}`, {
                      count: answer.total,
                      ok: answer.ok,
                      total: answer.total,
                    })}
              </span>
              {answer.blocked.length > 0 && (
                <span className="block text-xs text-dark-400">
                  {t('admin.reachability.answer.blocked', {
                    list: formatList(
                      unitNameList(answer.blocked, primary.data.units),
                      LISTED,
                      more,
                    ),
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {primary.data.panel_error && (
        <p className="text-xs text-warning-400">
          {t('admin.reachability.summary.panelError', { error: primary.data.panel_error })}
        </p>
      )}

      {launch.confirming ? (
        <div className="space-y-3 rounded-2xl border border-accent-500/40 p-4">
          <LaunchConfirm launch={launch} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={launch.cancel}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={launch.run} disabled={!launch.canRun}>
              {t('admin.reachability.launch.confirmCharge', { price })}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {running ? (
            <span className="text-sm text-accent-400">
              {t('admin.reachability.answer.running')}
            </span>
          ) : (
            body && (
              <Button variant="primary" onClick={launch.run} disabled={!launch.canRun}>
                {launch.isPending
                  ? t('admin.reachability.launch.running')
                  : `${t(anyChecked ? 'admin.reachability.answer.again' : 'admin.reachability.answer.first')}${price ? ` · ${price}` : ''}`}
              </Button>
            )
          )}
          {checkedAt && (
            <span className="text-xs text-dark-400">
              {t('admin.reachability.health.checked', {
                age: relativeAge(checkedAt, i18n.language),
              })}
            </span>
          )}
          {anyChecked && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="text-sm text-accent-400 hover:underline"
            >
              {t(
                open
                  ? 'admin.reachability.answer.hideDetails'
                  : 'admin.reachability.answer.details',
              )}
            </button>
          )}
        </div>
      )}
      {!running && !launch.confirming && launch.blocker && body && (
        <p className="text-xs text-dark-400">{launch.blocker}</p>
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
