import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  type Purpose,
  type ReachabilityStatus,
  type SummaryRow,
  type Unit,
  reachabilityApi,
} from '@/api/reachability';
import { MapPinIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import { OperatorIcon } from '../OperatorIcon';
import { PurposeChip } from '../PurposeChip';
import { buildReachabilityLink } from '../deepLink';
import { formatCredits } from '../money';
import { relativeAge } from '../relativeAge';
import { resultHeadline } from '../resultHeadline';
import { useInvalidateTargets } from '../useTargets';
import { STATE_TEXT } from './FleetRowItem';
import { type FleetRow, type OperatorBreakdown, operatorBreakdown, relevantDpi } from './fleet';
import { batchBody } from './scopeDefaults';

interface ServerDetailsProps {
  row: FleetRow;
  summaryRow: SummaryRow | undefined;
  units: Unit[];
  status: ReachabilityStatus | undefined;
  /** «Проверить этот сервер» отмечает его целью; симки и пробы выбираются на странице. */
  onCheck: () => void;
}

const HISTORY_ROWS = 3;
const TONE: Record<'ok' | 'warn' | 'down' | 'na' | 'pending', string> = {
  ok: 'bg-success-400',
  warn: 'bg-warning-400',
  down: 'bg-error-400',
  na: 'bg-dark-500',
  pending: 'bg-accent-400',
};

function operatorWords(
  t: (key: string, options?: Record<string, unknown>) => string,
  item: OperatorBreakdown,
) {
  const base = 'admin.reachability.server';
  if (item.ok === item.total) return { text: t(`${base}.catchesAll`), tone: STATE_TEXT.ok };
  if (item.ok === 0) return { text: t(`${base}.catchesNone`), tone: STATE_TEXT.down };
  return {
    text: t(`${base}.catchesNot`, { regions: item.blockedRegions.join(', ') }),
    tone: STATE_TEXT.partial,
  };
}

/**
 * Карточка под строкой сервера. Имя и вердикт уже в строке, поэтому здесь только новое:
 * адрес с назначением и кнопка «Проверить этот сервер · цена», счёт симок словами,
 * операторы сеткой в две колонки, прошлые проверки одной строкой; «Все» ведёт во вкладку
 * «История» с фильтром по этому серверу.
 */
export function ServerDetails({ row, summaryRow, units, status, onCheck }: ServerDetailsProps) {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const invalidate = useInvalidateTargets();
  const base = 'admin.reachability';

  const body = batchBody([row], 'manual', status);
  const price = useQuery({
    queryKey: ['admin-reachability-batch-preview', body.host_refs, body.dpi, body.sni_hosts],
    queryFn: () => reachabilityApi.previewBatch(body),
    enabled: row.ref !== null,
    staleTime: 60_000,
    retry: false,
  });
  const history = useQuery({
    queryKey: ['admin-reachability-server-history', row.key],
    queryFn: () => reachabilityApi.listJobs({ target_key: row.key, limit: HISTORY_ROWS }),
    staleTime: 30_000,
  });
  const setPurpose = useMutation({
    mutationFn: (purpose: Purpose) =>
      reachabilityApi.updatePref({ target_kind: 'host', target_ref: row.ref as string, purpose }),
    onSuccess: () => {
      invalidate();
      notify.success(t(`${base}.targets.purposeChanged`));
    },
    onError: (error) => notify.error(getApiErrorMessage(error, '')),
  });

  const breakdown = summaryRow
    ? operatorBreakdown(summaryRow, units, relevantDpi(row.purpose))
    : [];
  const summaryKey =
    row.purpose === 'bs'
      ? 'summaryBs'
      : row.purpose === 'regular'
        ? 'summaryRegular'
        : 'summaryAny';
  const checked = row.checkedAt
    ? t(`${base}.server.checked`, { age: relativeAge(row.checkedAt, i18n.language) })
    : '';
  const sentence =
    row.state === 'unchecked'
      ? t(`${base}.server.unchecked`)
      : [t(`${base}.server.${summaryKey}`, { ok: row.ok, total: row.total }), checked]
          .filter(Boolean)
          .join(' · ');
  const priceLabel = price.data?.cost_kopeks != null ? formatCredits(price.data.cost_kopeks) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-xs text-dark-300">{row.address}</span>
        <PurposeChip
          purpose={row.purpose}
          disabled={row.ref === null || setPurpose.isPending}
          onToggle={() => setPurpose.mutate(row.purpose === 'bs' ? 'regular' : 'bs')}
        />
        {row.ref !== null && (
          <Button
            variant="secondary"
            className="min-h-[44px] w-full sm:ms-auto sm:min-h-0 sm:w-auto"
            disabled={price.isLoading || priceLabel === null}
            onClick={onCheck}
          >
            {t(`${base}.server.checkOne`, { price: priceLabel ?? '…' })}
          </Button>
        )}
        {row.ref !== null && (
          <Link
            to={buildReachabilityLink({ mode: 'geo', targets: [{ kind: 'host', ref: row.ref }] })}
            className="btn-secondary inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 px-3 text-sm sm:min-h-0 sm:w-auto sm:py-1.5 sm:text-xs"
          >
            <MapPinIcon className="h-4 w-4" />
            {t(`${base}.geo.fromHost`)}
          </Link>
        )}
      </div>
      <p className="text-sm text-dark-300">{sentence}</p>

      {breakdown.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-[13px] font-semibold text-dark-400">
            {t(`${base}.server.byOperators`)}
          </h4>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {breakdown.map((item) => {
              const words = operatorWords(t, item);
              return (
                <li key={item.operator} className="flex min-h-[40px] items-center gap-2.5 py-1">
                  <OperatorIcon operator={item.operator} className="h-5 w-5 rounded" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-dark-100">{item.name}</span>
                    <span className={cn('block text-xs', words.tone)}>{words.text}</span>
                  </span>
                  <span className="text-xs tabular-nums text-dark-400">
                    {t(`${base}.server.ofUnits`, { ok: item.ok, total: item.total })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-1.5">
        <div className="flex items-center gap-3">
          <h4 className="text-[13px] font-semibold text-dark-400">{t(`${base}.server.history`)}</h4>
          <Link
            to={buildReachabilityLink({ mode: 'history', serverKey: row.key })}
            className="text-[13px] font-medium text-accent-400 hover:underline"
          >
            {t(`${base}.server.allHistory`)}
          </Link>
        </div>
        {history.isLoading && <Skeleton className="h-5 w-64" />}
        {history.data && history.data.items.length === 0 && (
          <p className="text-[13px] text-dark-500">{t(`${base}.recent.empty`)}</p>
        )}
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {history.data?.items.map((job) => {
            const headline = resultHeadline(job, row.key);
            const words =
              headline.total > 0
                ? t(`${base}.fleet.ofUnits`, { ok: headline.ok, total: headline.total })
                : t(`${base}.recent.headline.${headline.key}`, {
                    ok: headline.ok,
                    total: headline.total,
                    count: headline.total,
                  });
            return (
              <li key={job.id} className="flex min-h-[28px] items-center gap-2 text-[13px]">
                <span
                  aria-hidden="true"
                  className={cn('h-2 w-2 shrink-0 rounded-full', TONE[headline.tone])}
                />
                <span className="text-dark-400">
                  {relativeAge(job.finished_at ?? job.created_at, i18n.language)}
                </span>
                <span className="font-medium text-dark-200">{words}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
