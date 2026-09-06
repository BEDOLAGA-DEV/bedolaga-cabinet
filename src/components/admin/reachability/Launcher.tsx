import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type HostTarget,
  type NodeTarget,
  type Probes,
  type ReachabilityStatus,
  type TargetIn,
  type VlessCore,
  reachabilityApi,
} from '@/api/reachability';
import { AddressTargets } from './AddressTargets';
import { AdvancedOptions } from './AdvancedOptions';
import { HostTargets } from './HostTargets';
import { JobProgress } from './JobProgress';
import { LaunchAside, LaunchBar } from './LaunchAside';
import { ModeSwitch } from './ModeSwitch';
import { ScanTargets } from './ScanTargets';
import { type ConfigItem, SubscriptionTargets } from './SubscriptionTargets';
import { UnitsSummary } from './UnitsSummary';
import { autoUnitsFor } from './autoUnits';
import { type DeepLink, type LaunchMode, jobKindOf } from './deepLink';
import { buildProbeBody, buildScanBody, buildVlessBody } from './jobBodies';
import {
  DEFAULT_SNI_HOST,
  parseSniHosts,
  recallSniHosts,
  rememberSniHosts,
  sniNamesFor,
  sniNamesForAddresses,
} from './sniNames';
import { repeatFromJob } from './repeatFromJob';
import { parseTargets, scanSubnet } from './targetsInput';
import { dpiForSelection } from './unitSelection';
import { REACHABILITY_JOB_KEY } from './useReachabilityJob';
import { useParsedInput, useSubscriptionConfigs } from './useTargets';
import { useUnits } from './useUnits';

interface LauncherProps {
  status: ReachabilityStatus | undefined;
  link: DeepLink;
  onModeChange: (mode: LaunchMode) => void;
  /** Идущая проверка живёт в адресе страницы (?running=), чтобы пережить перезагрузку. */
  runningJobId: number | null;
  onRunning: (jobId: number | null) => void;
}

const PROBE_DEFAULT: Probes = { icmp: false, tcp: true, sni: true };
const SCAN_DEFAULT: Probes = { icmp: true, tcp: true, sni: false };

function toggleBy<T extends { uuid: string }>(list: T[], item: T): T[] {
  return list.some((entry) => entry.uuid === item.uuid)
    ? list.filter((entry) => entry.uuid !== item.uuid)
    : [...list, item];
}

/** Один запуск на все вкладки: цели по вкладке, пробы, SNI-хост, операторы, итог и кнопка. */
export function Launcher({ status, link, onModeChange, runningJobId, onRunning }: LauncherProps) {
  const mode = link.mode;
  const kind = jobKindOf(mode);
  const { data: catalog = [] } = useUnits();

  const [hosts, setHosts] = useState<HostTarget[]>([]);
  const [nodes, setNodes] = useState<NodeTarget[]>([]);
  const [addresses, setAddresses] = useState('');
  const [source, setSource] = useState({ userId: link.userId, shortUuid: link.shortUuid });
  const [pasted, setPasted] = useState('');
  const [configIndexes, setConfigIndexes] = useState<number[]>([]);
  const [core, setCore] = useState<VlessCore>('');
  const [cidr, setCidr] = useState('');
  // Симки: сами по назначению целей; null — человек не трогал руками.
  const [manualUnits, setManualUnits] = useState<string[] | null>(null);
  const [probes, setProbes] = useState<Probes>(PROBE_DEFAULT);
  const [scanProbes, setScanProbes] = useState<Probes>(SCAN_DEFAULT);
  // Как в оригинале: поле помнит последний ввод, иначе белый домен по умолчанию (зашит в код).
  const [sniHosts, setSniHosts] = useState(
    () => recallSniHosts() ?? status?.default_sni ?? DEFAULT_SNI_HOST,
  );
  const changeSni = (value: string) => {
    setSniHosts(value);
    rememberSniHosts(value);
  };

  // «Повторить» из журнала: цели, симки, пробы и SNI прошлой задачи подставляются в форму.
  const repeat = useQuery({
    queryKey: [REACHABILITY_JOB_KEY, 'repeat', link.repeatJobId],
    queryFn: () => reachabilityApi.getJob(link.repeatJobId as number),
    enabled: link.repeatJobId !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const repeatState = useMemo(
    () => (repeat.data ? repeatFromJob(repeat.data) : null),
    [repeat.data],
  );
  const appliedRepeat = useRef<number | null>(null);
  useEffect(() => {
    if (!repeat.data || !repeatState || appliedRepeat.current === repeat.data.id) return;
    appliedRepeat.current = repeat.data.id;
    setManualUnits(repeatState.units);
    if (repeatState.probes) {
      if (repeatState.mode === 'cidr') setScanProbes(repeatState.probes);
      else setProbes(repeatState.probes);
    }
    if (repeatState.sniHosts) setSniHosts(repeatState.sniHosts);
    setAddresses(repeatState.addresses);
    setCidr(repeatState.cidr);
    if (repeatState.shortUuid) {
      setSource({ userId: null, shortUuid: repeatState.shortUuid });
      setConfigIndexes(repeatState.configIndexes);
    }
  }, [repeat.data, repeatState]);

  const hasReference = Boolean(status?.reference?.short_uuid);
  const pastedMode = pasted.trim().length > 0;
  const subscription = useSubscriptionConfigs(
    source.userId,
    source.shortUuid,
    !pastedMode && (source.userId !== null || source.shortUuid !== null || hasReference),
  );
  const parsed = useParsedInput(pasted);

  const configList = useMemo<ConfigItem[]>(() => {
    if (pastedMode) return parsed.data?.configs ?? [];
    const data = subscription.data;
    if (!data) return [];
    return data.configs.map((config) => ({
      ...config,
      target: { kind: 'subscription_config', short_uuid: data.short_uuid, index: config.index },
    }));
  }, [pastedMode, parsed.data, subscription.data]);
  const rejected = (pastedMode ? parsed.data?.rejected : subscription.data?.rejected) ?? [];

  // Вставленные конфиги отмечаются сразу — их вставили, чтобы проверить; подписку выбирают руками.
  const autoSelectedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = pastedMode ? pasted.trim() : null;
    if (!key || !parsed.data || autoSelectedFor.current === key) return;
    autoSelectedFor.current = key;
    setConfigIndexes(parsed.data.configs.map((config) => config.index));
  }, [pastedMode, pasted, parsed.data]);

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
  const selectConfigs = (indexes: number[]) =>
    setConfigIndexes((list) => [...list, ...indexes.filter((index) => !list.includes(index))]);
  const changeSource = (next: { userId: number | null; shortUuid: string | null }) => {
    setSource(next);
    setConfigIndexes([]);
  };
  const changePasted = (text: string) => {
    setPasted(text);
    setConfigIndexes([]);
  };

  const targetPurposes = useMemo(() => {
    if (mode === 'hosts') {
      return [...hosts.map((host) => host.purpose), ...nodes.map(() => 'unknown' as const)];
    }
    if (mode === 'vless') {
      return configIndexes
        .map((index) => configList.find((config) => config.index === index)?.purpose)
        .filter((purpose): purpose is NonNullable<typeof purpose> => purpose !== undefined);
    }
    const hasTargets =
      mode === 'ip' ? parseTargets(addresses).targets.length > 0 : Boolean(scanSubnet(cidr));
    return hasTargets ? ['unknown' as const] : [];
  }, [mode, hosts, nodes, configIndexes, configList, addresses, cidr]);
  const autoUnits = useMemo(() => autoUnitsFor(targetPurposes, catalog), [targetPurposes, catalog]);
  const units = manualUnits ?? autoUnits;
  const dpi = dpiForSelection(catalog, units);
  const preselectedHosts = useMemo(
    () => [
      ...link.targets.filter((item) => item.kind === 'host').map((item) => item.ref),
      ...(repeatState?.hosts ?? []),
    ],
    [link.targets, repeatState],
  );
  const preselectedNodes = useMemo(
    () => [
      ...link.targets.filter((item) => item.kind === 'node').map((item) => item.ref),
      ...(repeatState?.nodes ?? []),
    ],
    [link.targets, repeatState],
  );
  const ownTargets = useMemo(() => parseTargets(addresses).targets, [addresses]);
  // Нода проверяется только ping-ом — при нодах ICMP не выключить.
  const hostProbes: Probes = { ...probes, icmp: probes.icmp || nodes.length > 0 };
  const sniParsed = useMemo(() => parseSniHosts(sniHosts), [sniHosts]);
  const vlessTargets = useMemo<TargetIn[]>(
    () =>
      configIndexes
        .map((index) => configList.find((config) => config.index === index)?.target)
        .filter((target): target is TargetIn => target !== undefined),
    [configIndexes, configList],
  );

  const body = useMemo(() => {
    if (mode === 'hosts') {
      return buildProbeBody({
        hosts: hosts.map((host) => host.uuid),
        nodes: nodes.map((node) => node.uuid),
        custom: [],
        units,
        dpi,
        probes,
        sniHosts: sniParsed.names,
      });
    }
    if (mode === 'ip') {
      return buildProbeBody({
        hosts: [],
        nodes: [],
        custom: ownTargets,
        units,
        dpi,
        probes,
        sniHosts: sniParsed.names,
      });
    }
    if (mode === 'vless') {
      return buildVlessBody({ targets: vlessTargets, units, dpi, core });
    }
    return buildScanBody({
      cidr: scanSubnet(cidr) ?? '',
      units,
      dpi,
      probes: scanProbes,
      sniHosts: sniParsed.names,
    });
  }, [
    mode,
    hosts,
    nodes,
    ownTargets,
    units,
    dpi,
    probes,
    sniParsed,
    vlessTargets,
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
          ? vlessTargets.length
          : scanSubnet(cidr)
            ? 1
            : 0;

  // Имена, которые бот возьмёт сам при пустом поле: SNI хоста или его домен; у IP имени нет.
  const autoSniNames = useMemo(
    () =>
      mode === 'hosts' ? sniNamesFor(hosts) : mode === 'ip' ? sniNamesForAddresses(ownTargets) : [],
    [mode, hosts, ownTargets],
  );
  const activeProbes = mode === 'cidr' ? scanProbes : mode === 'hosts' ? hostProbes : probes;
  const showSni = mode !== 'vless' && activeProbes.sni;

  if (runningJobId !== null) {
    return (
      <div id="reachability-launcher">
        <JobProgress jobId={runningJobId} onReset={() => onRunning(null)} />
      </div>
    );
  }

  const launchProps = {
    kind,
    targetsCount,
    body,
    status,
    onStarted: (job: { id: number }) => onRunning(job.id),
  };

  return (
    <div id="reachability-launcher" className="space-y-6">
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
              pasted={pasted}
              onPastedChange={changePasted}
              parsed={parsed}
              userId={source.userId}
              shortUuid={source.shortUuid}
              onSource={changeSource}
              subscription={subscription}
              reference={status?.reference ?? null}
              list={configList}
              rejected={rejected}
              selected={configIndexes}
              onToggle={toggleConfig}
              onSelectMany={selectConfigs}
              onClear={() => setConfigIndexes([])}
            />
          )}
          {mode === 'cidr' && <ScanTargets cidr={cidr} onChange={setCidr} />}

          <UnitsSummary
            kind={kind}
            selected={units}
            auto={manualUnits === null}
            onChange={setManualUnits}
            onReset={() => setManualUnits(null)}
          />
          {mode === 'vless' ? (
            <AdvancedOptions core={core} onCoreChange={setCore} cores={status?.cores} />
          ) : mode === 'cidr' ? (
            <AdvancedOptions
              probes={scanProbes}
              onProbesChange={setScanProbes}
              sniHosts={sniHosts}
              onSniChange={changeSni}
              autoSniNames={autoSniNames}
              showSni={showSni}
            />
          ) : (
            <AdvancedOptions
              probes={mode === 'hosts' ? hostProbes : probes}
              onProbesChange={setProbes}
              locked={mode === 'hosts' && nodes.length ? ['icmp'] : []}
              sniHosts={sniHosts}
              onSniChange={changeSni}
              autoSniNames={autoSniNames}
              showSni={showSni}
            />
          )}
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
