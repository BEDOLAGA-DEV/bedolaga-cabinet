import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type Probes,
  type ReachabilityStatus,
  type TargetIn,
  type VlessCore,
  reachabilityApi,
} from '@/api/reachability';
import { AddressTargets } from './AddressTargets';
import { CheckOptions } from './CheckOptions';
import { JobProgress } from './JobProgress';
import { LaunchAside, LaunchBar } from './LaunchAside';
import { OperatorPicker } from './OperatorPicker';
import { ScanTargets } from './ScanTargets';
import { type ConfigItem, SubscriptionTargets } from './SubscriptionTargets';
import { autoUnitsFor } from './autoUnits';
import { type DeepLink, jobKindOf } from './deepLink';
import { buildProbeBody, buildScanBody, buildVlessBody } from './jobBodies';
import { jobAdapterFor } from './launchAdapters';
import { repeatFromJob } from './repeatFromJob';
import {
  DEFAULT_SNI_HOST,
  parseSniHosts,
  recallSniHosts,
  rememberSniHosts,
  sniNamesForAddresses,
} from './sniNames';
import { parseTargets, scanSubnet } from './targetsInput';
import { dpiForSelection } from './unitSelection';
import { useLaunch } from './useLaunch';
import { REACHABILITY_JOB_KEY } from './useReachabilityJob';
import { useParsedInput, useSubscriptionConfigs } from './useTargets';
import { useUnits } from './useUnits';

interface LauncherProps {
  status: ReachabilityStatus | undefined;
  link: DeepLink;
  /** Идущая проверка живёт в адресе страницы (?running=), чтобы пережить перезагрузку. */
  runningJobId: number | null;
  onRunning: (jobId: number | null) => void;
}

const PROBE_DEFAULT: Probes = { icmp: false, tcp: true, sni: true };
const SCAN_DEFAULT: Probes = { icmp: true, tcp: true, sni: false };

/**
 * Одиночные проверки как на bsbord.com: цели вкладки, пробы под ними, операторы по округам,
 * «Запуск» справа (на телефоне — панель снизу). Хосты панели живут на своей вкладке.
 */
export function Launcher({ status, link, runningJobId, onRunning }: LauncherProps) {
  const mode = link.mode === 'hosts' ? 'ip' : link.mode;
  const kind = jobKindOf(mode);
  const { data: catalog = [], isLoading: unitsLoading } = useUnits();

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

  const ownTargets = useMemo(() => parseTargets(addresses).targets, [addresses]);
  const targetPurposes = useMemo(() => {
    if (mode === 'vless') {
      return configIndexes
        .map((index) => configList.find((config) => config.index === index)?.purpose)
        .filter((purpose): purpose is NonNullable<typeof purpose> => purpose !== undefined);
    }
    const hasTargets = mode === 'ip' ? ownTargets.length > 0 : Boolean(scanSubnet(cidr));
    return hasTargets ? ['unknown' as const] : [];
  }, [mode, configIndexes, configList, ownTargets, cidr]);
  const autoUnits = useMemo(() => autoUnitsFor(targetPurposes, catalog), [targetPurposes, catalog]);
  const units = manualUnits ?? autoUnits;
  const dpi = dpiForSelection(catalog, units);
  const sniParsed = useMemo(() => parseSniHosts(sniHosts), [sniHosts]);
  const vlessTargets = useMemo<TargetIn[]>(
    () =>
      configIndexes
        .map((index) => configList.find((config) => config.index === index)?.target)
        .filter((target): target is TargetIn => target !== undefined),
    [configIndexes, configList],
  );

  const body = useMemo(() => {
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
  }, [mode, ownTargets, units, dpi, probes, sniParsed, vlessTargets, core, cidr, scanProbes]);

  // Имена, которые бот возьмёт сам при пустом поле: домен цели; у IP имени нет.
  const autoSniNames = useMemo(
    () => (mode === 'ip' ? sniNamesForAddresses(ownTargets) : []),
    [mode, ownTargets],
  );
  const activeProbes = mode === 'cidr' ? scanProbes : probes;
  const showSni = mode !== 'vless' && activeProbes.sni;

  const adapter = useMemo(() => jobAdapterFor(kind), [kind]);
  const launch = useLaunch(body, status, (job) => onRunning(job.id), adapter);

  if (runningJobId !== null) {
    return (
      <div id="reachability-launcher">
        <JobProgress jobId={runningJobId} onReset={() => onRunning(null)} />
      </div>
    );
  }

  return (
    <div
      id="reachability-launcher"
      className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8"
    >
      <div className="space-y-8">
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

        {mode === 'vless' ? (
          <CheckOptions core={core} onCoreChange={setCore} cores={status?.cores} />
        ) : mode === 'cidr' ? (
          <CheckOptions
            probes={scanProbes}
            onProbesChange={setScanProbes}
            sniHosts={sniHosts}
            onSniChange={changeSni}
            autoSniNames={autoSniNames}
            showSni={showSni}
          />
        ) : (
          <CheckOptions
            probes={probes}
            onProbesChange={setProbes}
            sniHosts={sniHosts}
            onSniChange={changeSni}
            autoSniNames={autoSniNames}
            showSni={showSni}
          />
        )}

        <OperatorPicker
          kind={kind}
          units={catalog}
          selected={units}
          onChange={setManualUnits}
          loading={unitsLoading}
        />
      </div>
      <div className="hidden lg:block">
        <LaunchAside launch={launch} />
      </div>
      <div className="lg:hidden">{launch.targetsCount > 0 && <LaunchBar launch={launch} />}</div>
    </div>
  );
}
