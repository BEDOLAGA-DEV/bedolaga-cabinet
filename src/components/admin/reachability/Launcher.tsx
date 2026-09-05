import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  HostTarget,
  NodeTarget,
  Probes,
  ReachabilityStatus,
  VlessCore,
} from '@/api/reachability';
import { AddressTargets } from './AddressTargets';
import { HostTargets } from './HostTargets';
import { JobProgress } from './JobProgress';
import { LaunchAside, LaunchBar } from './LaunchAside';
import { ModeSwitch } from './ModeSwitch';
import { OperatorPicker } from './OperatorPicker';
import { ProbesRow } from './ProbesRow';
import { ScanTargets } from './ScanTargets';
import { SectionHeading } from './SectionHeading';
import { SubscriptionTargets } from './SubscriptionTargets';
import { type DeepLink, type LaunchMode, jobKindOf } from './deepLink';
import { buildProbeBody, buildScanBody, buildVlessBody } from './jobBodies';
import { sniNamesFor, sniNamesForAddresses } from './sniNames';
import { parseTargets, scanSubnet } from './targetsInput';
import { dpiForSelection } from './unitSelection';
import { useSubscriptionConfigs } from './useTargets';
import { useUnits } from './useUnits';

interface LauncherProps {
  status: ReachabilityStatus | undefined;
  link: DeepLink;
  onModeChange: (mode: LaunchMode) => void;
}

const PROBE_DEFAULT: Probes = { icmp: false, tcp: true, sni: true };
const SCAN_DEFAULT: Probes = { icmp: true, tcp: true, sni: false };

function toggleBy<T extends { uuid: string }>(list: T[], item: T): T[] {
  return list.some((entry) => entry.uuid === item.uuid)
    ? list.filter((entry) => entry.uuid !== item.uuid)
    : [...list, item];
}

/** Один запуск на все вкладки: цели по вкладке, пробы, операторы, итог и кнопка. */
export function Launcher({ status, link, onModeChange }: LauncherProps) {
  const { t } = useTranslation();
  const mode = link.mode;
  const kind = jobKindOf(mode);
  const { data: catalog = [] } = useUnits();

  const [hosts, setHosts] = useState<HostTarget[]>([]);
  const [nodes, setNodes] = useState<NodeTarget[]>([]);
  const [addresses, setAddresses] = useState('');
  const [source, setSource] = useState({ userId: link.userId, shortUuid: link.shortUuid });
  const [configIndexes, setConfigIndexes] = useState<number[]>([]);
  const [core, setCore] = useState<VlessCore>('');
  const [cidr, setCidr] = useState('');
  const [units, setUnits] = useState<string[]>([]);
  const [probes, setProbes] = useState<Probes>(PROBE_DEFAULT);
  const [scanProbes, setScanProbes] = useState<Probes>(SCAN_DEFAULT);
  const [jobId, setJobId] = useState<number | null>(null);

  const hasReference = Boolean(status?.reference?.short_uuid);
  const configs = useSubscriptionConfigs(
    source.userId,
    source.shortUuid,
    source.userId !== null || source.shortUuid !== null || hasReference,
  );
  const toggleHost = useCallback(
    (host: HostTarget) => setHosts((list) => toggleBy(list, host)),
    [],
  );
  const toggleNode = useCallback(
    (node: NodeTarget) => setNodes((list) => toggleBy(list, node)),
    [],
  );
  const toggleConfig = (index: number) =>
    setConfigIndexes((list) =>
      list.includes(index) ? list.filter((item) => item !== index) : [...list, index],
    );
  const changeSource = (next: { userId: number | null; shortUuid: string | null }) => {
    setSource(next);
    setConfigIndexes([]);
  };

  const dpi = dpiForSelection(catalog, units);
  const preselectedHosts = useMemo(
    () => link.targets.filter((item) => item.kind === 'host').map((item) => item.ref),
    [link.targets],
  );
  const preselectedNodes = useMemo(
    () => link.targets.filter((item) => item.kind === 'node').map((item) => item.ref),
    [link.targets],
  );
  const ownTargets = useMemo(() => parseTargets(addresses).targets, [addresses]);
  // Нода проверяется только ping-ом — при нодах ICMP не выключить.
  const hostProbes: Probes = { ...probes, icmp: probes.icmp || nodes.length > 0 };

  const body = useMemo(() => {
    if (mode === 'hosts') {
      return buildProbeBody({
        hosts: hosts.map((host) => host.uuid),
        nodes: nodes.map((node) => node.uuid),
        custom: [],
        units,
        dpi,
        probes,
      });
    }
    if (mode === 'ip') {
      return buildProbeBody({ hosts: [], nodes: [], custom: ownTargets, units, dpi, probes });
    }
    if (mode === 'vless') {
      return buildVlessBody({
        shortUuid: configs.data?.short_uuid ?? null,
        indexes: configIndexes,
        units,
        dpi,
        core,
      });
    }
    return buildScanBody({
      cidr: scanSubnet(cidr) ?? '',
      units,
      dpi,
      probes: { ...scanProbes, sni: false },
    });
  }, [
    mode,
    hosts,
    nodes,
    ownTargets,
    units,
    dpi,
    probes,
    configs.data,
    configIndexes,
    core,
    cidr,
    scanProbes,
  ]);

  const targetsCount =
    mode === 'hosts'
      ? hosts.length + nodes.length
      : mode === 'ip'
        ? ownTargets.length
        : mode === 'vless'
          ? configIndexes.length
          : scanSubnet(cidr)
            ? 1
            : 0;

  // Имена для TLS-SNI видны до запуска: SNI хоста или его домен; у IP имени нет.
  const sniNames = useMemo(
    () =>
      mode === 'hosts' ? sniNamesFor(hosts) : mode === 'ip' ? sniNamesForAddresses(ownTargets) : [],
    [mode, hosts, ownTargets],
  );
  const showSniNames = mode !== 'cidr' && mode !== 'vless' && probes.sni && targetsCount > 0;

  if (jobId !== null) {
    return (
      <div className="space-y-6">
        <ModeSwitch value={mode} onChange={onModeChange} />
        <JobProgress jobId={jobId} onReset={() => setJobId(null)} />
      </div>
    );
  }

  const launchProps = {
    kind,
    targetsCount,
    body,
    status,
    onStarted: (job: { id: number }) => setJobId(job.id),
  };

  return (
    <div className="space-y-6">
      <ModeSwitch value={mode} onChange={onModeChange} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        <div className="space-y-8">
          {mode === 'hosts' && (
            <HostTargets
              hosts={hosts}
              onToggleHost={toggleHost}
              nodes={nodes}
              onToggleNode={toggleNode}
              preselectedHosts={preselectedHosts}
              preselectedNodes={preselectedNodes}
            />
          )}
          {mode === 'ip' && <AddressTargets value={addresses} onChange={setAddresses} />}
          {mode === 'vless' && (
            <SubscriptionTargets
              userId={source.userId}
              shortUuid={source.shortUuid}
              onSource={changeSource}
              data={configs.data}
              isLoading={configs.isLoading}
              error={configs.error}
              selected={configIndexes}
              onToggle={toggleConfig}
              core={core}
              onCoreChange={setCore}
              reference={status?.reference ?? null}
              cores={status?.cores}
            />
          )}
          {mode === 'cidr' && <ScanTargets cidr={cidr} onChange={setCidr} />}

          {mode !== 'vless' && (
            <section aria-labelledby="reachability-probes" className="space-y-3">
              <SectionHeading
                id="reachability-probes"
                title={t('admin.reachability.sections.probes')}
              />
              {mode === 'cidr' ? (
                <ProbesRow
                  probes={{ ...scanProbes, sni: false }}
                  onChange={setScanProbes}
                  locked={['sni']}
                />
              ) : (
                <ProbesRow
                  probes={mode === 'hosts' ? hostProbes : probes}
                  onChange={setProbes}
                  locked={mode === 'hosts' && nodes.length ? ['icmp'] : []}
                />
              )}
              {showSniNames && (
                <p className="text-xs text-dark-400">
                  {sniNames.length > 0 ? (
                    t('admin.reachability.probes.sniNames', { names: sniNames.join(', ') })
                  ) : (
                    <span className="text-warning-400">
                      {t('admin.reachability.probes.sniNoNames')}
                    </span>
                  )}
                </p>
              )}
            </section>
          )}
          <OperatorPicker kind={kind} selected={units} onChange={setUnits} />
        </div>
        <div className="hidden lg:block">
          <LaunchAside {...launchProps} />
        </div>
        <div className="lg:hidden">
          <LaunchBar {...launchProps} />
        </div>
      </div>
    </div>
  );
}
