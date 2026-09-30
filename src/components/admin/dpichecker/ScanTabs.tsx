import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dpicheckerApi, type NoisyScan, type ProbeScan } from '@/api/dpichecker';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { CsvButton } from './CsvButton';
import { CHECK_POLL_MS } from './pollInterval';
import { useDpiStatus } from './useDpiStatus';

const FINISHED = new Set(['done', 'completed', 'failed', 'cancelled', 'error']);
const PROBE_FIXED_USD = '1.00';

function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isProbe(scan: NoisyScan | ProbeScan): scan is ProbeScan {
  return 'stage' in scan;
}

function PairList({ title, items }: { title: string; items: { ip: string; domain: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-dark-100">
        {title} — {items.length}
      </h4>
      <ul className="space-y-0.5 text-xs text-dark-300">
        {items.map((item) => (
          <li key={`${item.ip}-${item.domain}`} className="font-mono">
            {item.ip} {item.domain}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoisyReport({ scan, actionId }: { scan: NoisyScan; actionId: number }) {
  const { t } = useTranslation();
  const analysis = scan.analysis;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-dark-200">
          {t('admin.dpichecker.noisy.found', { count: scan.result_count ?? 0 })}
        </p>
        {(scan.result_count ?? 0) > 0 && <CsvButton kind="noisy" actionId={actionId} />}
      </div>
      {analysis && (
        <>
          <PairList title={t('admin.dpichecker.noisy.badRu')} items={analysis.bad_ru} />
          <PairList title={t('admin.dpichecker.noisy.vpnLike')} items={analysis.vpn_like} />
          <PairList title={t('admin.dpichecker.noisy.badForeign')} items={analysis.bad_foreign} />
          {analysis.bad_ru.length + analysis.vpn_like.length + analysis.bad_foreign.length ===
            0 && <p className="text-sm text-success-400">{t('admin.dpichecker.noisy.quiet')}</p>}
        </>
      )}
    </div>
  );
}

function ProbeReport({ scan }: { scan: ProbeScan }) {
  const { t } = useTranslation();
  const results = scan.results;
  if (!results) return null;
  const perPop = results.assessment.per_pop;
  const whole = perPop.filter((pop) => pop.tested > 0 && pop.blocked === pop.tested).length;
  const part = perPop.filter((pop) => pop.blocked > 0 && pop.blocked < pop.tested).length;
  const clean = perPop.length - whole - part;
  const tested = scan.tested_ips ?? 0;
  const blocked = scan.blocked_ips ?? 0;
  const drops = new Map<string, { ip: string; domain: string }[]>();
  for (const drop of results.drops)
    drops.set(drop.reason, [...(drops.get(drop.reason) ?? []), drop]);
  return (
    <div className="space-y-3">
      <p className={cn('text-base font-semibold', blocked ? 'text-error-400' : 'text-success-400')}>
        {t(`admin.dpichecker.probe.verdict.${scan.verdict ?? 'unknown'}`, {
          defaultValue: t('admin.dpichecker.probe.verdict.unknown'),
        })}
      </p>
      <p className="text-sm text-dark-200">
        {t('admin.dpichecker.probe.blocked', {
          blocked,
          tested,
          percent: tested ? Math.round((blocked / tested) * 100) : 0,
        })}
      </p>
      <p className="text-sm text-dark-200">
        {t('admin.dpichecker.probe.regions', { whole, part, clean })}
      </p>
      <p className="text-xs text-dark-400">
        {t('admin.dpichecker.probe.pipeline', {
          scanned: results.scanned,
          kept: results.kept,
          inSubnet: results.in_subnet,
          foreign: results.foreign_ok,
          tested: results.tested,
        })}
      </p>
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-dark-100">{t('admin.dpichecker.probe.byIp')}</h4>
        <ul className="space-y-1">
          {results.assessment.per_ip.map((ip) => (
            <li key={ip.ip} className="flex flex-wrap gap-x-3 text-xs text-dark-300">
              <span className="font-mono text-dark-100">{ip.ip}</span>
              <span>{ip.domain}</span>
              <span>
                {t(`admin.dpichecker.probe.state.${ip.state}`, { defaultValue: ip.state })}
              </span>
              <span className="tabular-nums">
                {t('admin.dpichecker.probe.pops', {
                  green: ip.pops_green,
                  yellow: ip.pops_yellow,
                  red: ip.pops_red,
                  total: ip.pops_total,
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-dark-100">
          {t('admin.dpichecker.probe.byRegion')}
        </h4>
        <ul className="grid gap-x-4 text-xs text-dark-300 sm:grid-cols-2">
          {perPop.map((pop) => (
            <li key={pop.pop_id}>
              {t('admin.dpichecker.probe.regionLine', {
                name: pop.name,
                blocked: pop.blocked,
                tested: pop.tested,
              })}
            </li>
          ))}
        </ul>
      </div>
      {drops.size > 0 && (
        <details className="rounded-xl bg-dark-800/40 p-3">
          <summary className="cursor-pointer text-sm text-dark-200">
            {t('admin.dpichecker.probe.drops')}
          </summary>
          <div className="mt-2 space-y-2">
            {[...drops.entries()].map(([reason, items]) => (
              <PairList
                key={reason}
                title={t(`admin.dpichecker.probe.drop.${reason}`, { defaultValue: reason })}
                items={items}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Скан (Соседи или Зонд): пока идёт — этап словами, готово — отчёт как на сайте. */
export function ScanResult({ actionId }: { actionId: number }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['dpichecker', 'scan', actionId],
    queryFn: () => dpicheckerApi.getScan(actionId),
    refetchInterval: (state) =>
      state.state.data && !FINISHED.has(state.state.data.scan.status) ? CHECK_POLL_MS : false,
  });
  if (query.isLoading) {
    return (
      <SkeletonGroup>
        <Skeleton variant="card" className="h-24 w-full" />
      </SkeletonGroup>
    );
  }
  if (!query.data) {
    return (
      <p className="text-sm text-error-400">
        {getApiErrorMessage(query.error, t('admin.dpichecker.result.loadFailed'))}
      </p>
    );
  }
  const { action, scan } = query.data;
  const done = FINISHED.has(scan.status);
  return (
    <section className="bento-card space-y-3 p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-base font-semibold text-dark-100">
          {scan.cidr ?? scan.raw_target}
        </h3>
        {isProbe(scan) && (
          <span className="text-xs tabular-nums text-dark-400">
            {t('admin.dpichecker.probe.cost', {
              fixed: Number(scan.fixed_cost ?? 0).toFixed(4),
              traffic: Number(scan.traffic_cost ?? 0).toFixed(4),
              mb: (Number(scan.traffic_bytes ?? 0) / 1_000_000).toFixed(2),
            })}
          </span>
        )}
      </header>
      {!done && (
        <p role="status" className="text-sm text-dark-300">
          {isProbe(scan)
            ? t(`admin.dpichecker.probe.stage.${scan.stage}`, {
                defaultValue: t('admin.dpichecker.status.running'),
              })
            : t('admin.dpichecker.status.running')}
        </p>
      )}
      {done && scan.status !== 'done' && scan.status !== 'completed' && (
        <p className="text-sm text-error-400">
          {t(`admin.dpichecker.status.${scan.status}`, { defaultValue: scan.status })}
        </p>
      )}
      {done && isProbe(scan) && <ProbeReport scan={scan} />}
      {done && !isProbe(scan) && <NoisyReport scan={scan} actionId={action.id} />}
    </section>
  );
}

function ScanForm({ kind }: { kind: 'noisy' | 'probe' }) {
  const { t } = useTranslation();
  const { data: status } = useDpiStatus();
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [launched, setLaunched] = useState<number[]>([]);
  const inFlight = useRef(false);
  const launch = useMutation({
    mutationFn: async () => {
      const targets = kind === 'probe' ? lines(text).slice(0, 1) : lines(text);
      const ids: number[] = [];
      for (const target of targets) {
        const call = kind === 'probe' ? dpicheckerApi.launchProbe : dpicheckerApi.launchNoisy;
        ids.push((await call({ target, source: 'paste' })).id);
      }
      return ids;
    },
    onSuccess: (ids) => {
      setLaunched((previous) => [...ids, ...previous]);
      setConfirming(false);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });
  const noisy = status?.noisy;
  const exhausted = kind === 'noisy' && noisy && !noisy.unlimited && (noisy.remaining ?? 0) <= 0;
  const run = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    launch.mutate();
  };

  return (
    <div className="space-y-4">
      <section className="bento-card space-y-3 p-4 sm:p-5">
        <p className="text-sm text-dark-300">
          {kind === 'noisy'
            ? t('admin.dpichecker.noisy.intro', { used: noisy?.used ?? 0 })
            : t('admin.dpichecker.probe.intro')}
        </p>
        {kind === 'probe' && (
          <details className="rounded-xl bg-dark-800/40 p-3 text-sm text-dark-300">
            <summary className="cursor-pointer font-medium text-dark-100">
              {t('admin.dpichecker.probe.howTitle')}
            </summary>
            <ol className="mt-2 list-decimal space-y-1 ps-5">
              {[1, 2, 3, 4, 5].map((step) => (
                <li key={step}>{t(`admin.dpichecker.probe.how${step}`)}</li>
              ))}
            </ol>
            <p className="mt-2">{t('admin.dpichecker.probe.why')}</p>
          </details>
        )}
        <textarea
          className="input min-h-[96px] w-full font-mono text-xs"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t(`admin.dpichecker.${kind}.placeholder`)}
          aria-label={t(`admin.dpichecker.${kind}.placeholder`)}
        />
        {kind === 'probe' && (
          <p className="text-xs text-dark-400">{t('admin.dpichecker.probe.price')}</p>
        )}
        {exhausted && (
          <p className="text-sm text-warning-400">{t('admin.dpichecker.noisy.exhausted')}</p>
        )}
        {launch.isError && (
          <p className="text-sm text-error-400">
            {getApiErrorMessage(launch.error, t('admin.dpichecker.form.failed'))}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {kind === 'noisy' && (
            <button
              type="button"
              className="btn-primary min-h-[44px] px-5 text-sm"
              disabled={!text.trim() || launch.isPending || Boolean(exhausted)}
              onClick={run}
            >
              {t('admin.dpichecker.noisy.run')}
            </button>
          )}
          {kind === 'probe' && !confirming && (
            <button
              type="button"
              className="btn-primary min-h-[44px] px-5 text-sm"
              disabled={!text.trim() || launch.isPending}
              onClick={() => setConfirming(true)}
            >
              {t('admin.dpichecker.form.pay')}
            </button>
          )}
          {kind === 'probe' && confirming && (
            <>
              <button
                type="button"
                className="btn-primary min-h-[44px] px-5 text-sm"
                disabled={launch.isPending}
                onClick={run}
              >
                {t('admin.dpichecker.probe.confirm', { value: PROBE_FIXED_USD })}
              </button>
              <button
                type="button"
                className="btn-ghost min-h-[44px] px-4 text-sm"
                onClick={() => setConfirming(false)}
              >
                {t('admin.dpichecker.form.cancel')}
              </button>
            </>
          )}
        </div>
      </section>
      {launched.map((id) => (
        <ScanResult key={id} actionId={id} />
      ))}
    </div>
  );
}

/** «Шумные соседи»: SNI хостов подсети /24 рядом с сервером. Бесплатно, до 10 в день. */
export function NoisyTab() {
  return <ScanForm kind="noisy" />;
}

/** «Зонд»: заблокирована ли подсеть целиком по /24 или ТСПУ бьёт по отдельным адресам. */
export function ProbeTab() {
  return <ScanForm kind="probe" />;
}
