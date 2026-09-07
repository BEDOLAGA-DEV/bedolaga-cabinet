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
import { CloseIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import { OperatorIcon } from '../OperatorIcon';
import { PurposeChip } from '../PurposeChip';
import { REACHABILITY_PATH } from '../deepLink';
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
  onClose: () => void;
  /** «Проверить этот сервер» открывает «Что проверить?» с этим сервером: симки и пробы выбираются там. */
  onCheck: () => void;
  /** В шите заголовок и «закрыть» даёт сама обёртка. */
  withHeader?: boolean;
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
 * Карточка сервера: вердикт словом, «ловит у 7 из 15 симок с Белым списком», разбор по операторам
 * словами, прошлые проверки и кнопка проверить один этот сервер с ценой по симкам его назначения.
 */
export function ServerDetails({
  row,
  summaryRow,
  units,
  status,
  onClose,
  onCheck,
  withHeader = true,
}: ServerDetailsProps) {
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
  const priceLabel = price.data?.cost_kopeks != null ? formatCredits(price.data.cost_kopeks) : null;

  return (
    <div className="space-y-5">
      {withHeader && (
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-bold text-dark-50">{row.label}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(`${base}.server.close`)}
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dark-400 hover:bg-dark-800 hover:text-dark-200"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-dark-400">{row.address}</span>
        <PurposeChip
          purpose={row.purpose}
          disabled={row.ref === null || setPurpose.isPending}
          onToggle={() => setPurpose.mutate(row.purpose === 'bs' ? 'regular' : 'bs')}
        />
      </div>

      <div className="space-y-1">
        <p
          className={cn('text-xl font-semibold tracking-tight md:text-2xl', STATE_TEXT[row.state])}
        >
          {t(`${base}.fleet.state.${row.state}`)}
        </p>
        <p className="text-sm text-dark-300">
          {row.state === 'unchecked'
            ? t(`${base}.server.unchecked`)
            : [t(`${base}.server.${summaryKey}`, { ok: row.ok, total: row.total }), checked]
                .filter(Boolean)
                .join(' · ')}
        </p>
      </div>

      {breakdown.length > 0 && (
        <section className="space-y-1">
          <h4 className="text-[13px] font-semibold text-dark-400">
            {t(`${base}.server.byOperators`)}
          </h4>
          <ul className="divide-y divide-dark-700/30">
            {breakdown.map((item) => {
              const words = operatorWords(t, item);
              return (
                <li key={item.operator} className="flex min-h-[44px] items-center gap-3 py-1.5">
                  <OperatorIcon operator={item.operator} className="h-6 w-6" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-dark-100">{item.name}</span>
                    <span className={cn('block text-[13px] font-medium', words.tone)}>
                      {words.text}
                    </span>
                  </span>
                  <span className="text-xs text-dark-400">
                    {t(`${base}.server.ofUnits`, { ok: item.ok, total: item.total })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-semibold text-dark-400">{t(`${base}.server.history`)}</h4>
          <Link
            to={`${REACHABILITY_PATH}/history`}
            className="text-[13px] font-medium text-accent-400 hover:underline"
          >
            {t(`${base}.server.allHistory`)}
          </Link>
        </div>
        {history.isLoading && <Skeleton className="h-9 w-full" />}
        {history.data && history.data.items.length === 0 && (
          <p className="text-[13px] text-dark-500">{t(`${base}.recent.empty`)}</p>
        )}
        <ul className="divide-y divide-dark-700/30">
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
              <li key={job.id} className="flex min-h-[36px] items-center gap-2.5 py-1">
                <span
                  aria-hidden="true"
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE[headline.tone])}
                />
                <span className="text-[13px] text-dark-400">
                  {relativeAge(job.finished_at ?? job.created_at, i18n.language)}
                </span>
                <span className="flex-1" />
                <span className="text-[13px] font-semibold text-dark-200">{words}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {row.ref !== null && (
        <Button
          variant="primary"
          fullWidth
          className="min-h-[44px]"
          disabled={price.isLoading || priceLabel === null}
          onClick={onCheck}
        >
          {priceLabel
            ? t(`${base}.server.checkOne`, { price: priceLabel })
            : t(`${base}.server.checkOne`, { price: '…' })}
        </Button>
      )}
    </div>
  );
}
