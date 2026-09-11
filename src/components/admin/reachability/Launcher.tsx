import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type GeoCityRef,
  type Job,
  type Probes,
  type ReachabilityStatus,
  type TargetIn,
  type VlessCore,
  reachabilityApi,
} from '@/api/reachability';
import { AddressTargets } from './AddressTargets';
import { CheckOptions } from './CheckOptions';
import { GeoLauncherForm } from './GeoLauncher';
import { parseGeoAddresses } from './GeoTargets';
import { JobProgress } from './JobProgress';
import { LaunchAside, LaunchBar } from './LaunchAside';
import { OperatorPicker } from './OperatorPicker';
import { ScanTargets } from './ScanTargets';
import { initialSelection } from './autoSelect';
import { type ConfigItem, SubscriptionTargets } from './SubscriptionTargets';
import { autoUnitsFor } from './autoUnits';
import { type DeepLink, jobKindOf } from './deepLink';
import {
  DEFAULT_GEO_FORM,
  type GeoCityPick,
  type GeoFormState,
  type GeoTargetKind,
  recallGeoForm,
  rememberGeoForm,
} from './geoForm';
import { geoRowsOf } from './geoRowsView';
import { buildGeoBody, buildProbeBody, buildScanBody, buildVlessBody } from './jobBodies';
import { jobAdapterFor } from './launchAdapters';
import { type RepeatState, repeatFromJob } from './repeatFromJob';
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
/** Город для перепроверки из отчёта: подпись по-русски берётся из строк той же задачи. */
function geoCityPick(job: Job, ref: GeoCityRef): GeoCityPick {
  const row = geoRowsOf(job).find((item) => item.region === ref.region && item.city === ref.city);
  const label = row ? `${row.city_ru || row.city} · ${row.region_ru || row.region}` : ref.city;
  return { ...ref, label };
}

/** Вид целей GEO по прошлой задаче: что в ней было, то и выбираем. */
function geoTargetKindOf(repeat: RepeatState): GeoTargetKind {
  if (repeat.hosts.length > 0) return 'hosts';
  if (repeat.addresses.trim().length > 0) return 'addresses';
  return 'vless';
}

export function Launcher({ status, link, runningJobId, onRunning }: LauncherProps) {
  const { t } = useTranslation();
  const mode = link.mode === 'hosts' || link.mode === 'history' ? 'ip' : link.mode;
  const kind = jobKindOf(mode);
  const { data: catalog = [], isLoading: unitsLoading } = useUnits();

  const [addresses, setAddresses] = useState('');
  const [source, setSource] = useState({ userId: link.userId, shortUuid: link.shortUuid });
  const [pasted, setPasted] = useState('');
  const [configIndexes, setConfigIndexes] = useState<number[]>([]);
  const [core, setCore] = useState<VlessCore>('');
  const [cidr, setCidr] = useState('');
  // GEO: хосты из ссылки (?target=host:…), свои адреса, блоки «Откуда/Метод» — как в прошлый раз.
  const [geoHosts, setGeoHosts] = useState<string[]>(() =>
    link.targets.filter((target) => target.kind === 'host').map((target) => target.ref),
  );
  const [geoAddresses, setGeoAddresses] = useState('');
  const [geoForm, setGeoForm] = useState<GeoFormState>(() => {
    const recalled = recallGeoForm() ?? DEFAULT_GEO_FORM;
    // Хост из ссылки (карточка сервера) — сразу вид «хосты панели», что бы ни помнилось.
    return link.targets.some((target) => target.kind === 'host')
      ? { ...recalled, targetKind: 'hosts' }
      : recalled;
  });
  // Человек трогал «Откуда/Метод» руками — автоматика (TCP для хостов панели) больше не вмешивается.
  const geoTouched = useRef(false);
  const changeGeoForm = (next: GeoFormState) => {
    geoTouched.current = true;
    setGeoForm(next);
  };
  const changeGeoHosts = (next: string[]) => {
    setGeoHosts(next);
    // У VPN-хоста TLS без нужного SNI покажет ложный отказ — хостам панели по умолчанию TCP.
    if (next.length > 0 && geoForm.probeMode !== 'tcp' && !geoTouched.current) {
      setGeoForm({ ...geoForm, probeMode: 'tcp' });
    }
  };
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
    if (repeatState.mode === 'geo') {
      setGeoHosts(repeatState.hosts);
      setGeoAddresses(repeatState.addresses);
      const city = link.geoCity ? geoCityPick(repeat.data, link.geoCity) : null;
      setGeoForm((form) => ({
        ...form,
        targetKind: geoTargetKindOf(repeatState),
        ...(city
          ? {
              scopeKind: 'cities' as const,
              cities: [city],
              isp: null,
              cityLimit: 0,
              session: link.geoSession?.sid ?? null,
              expectExitIp: link.geoSession?.exitIp ?? null,
            }
          : {}),
      }));
    }
    if (repeatState.shortUuid) {
      setSource({ userId: null, shortUuid: repeatState.shortUuid });
      setConfigIndexes(repeatState.configIndexes);
    }
  }, [repeat.data, repeatState, link.geoCity, link.geoSession]);

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
    const selected = initialSelection(parsed.data.configs);
    // GEO берёт один конфиг туннеля.
    setConfigIndexes(mode === 'geo' ? selected.slice(0, 1) : selected);
  }, [pastedMode, pasted, parsed.data, mode]);

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

  const geoConfig =
    mode === 'geo' && geoForm.targetKind === 'vless' ? (vlessTargets[0] ?? null) : null;

  const body = useMemo(() => {
    if (mode === 'geo') {
      return buildGeoBody({
        hosts: geoHosts,
        custom: parseGeoAddresses(geoAddresses).targets,
        config: geoConfig,
        form: geoForm,
        core,
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
    ownTargets,
    units,
    dpi,
    probes,
    sniParsed,
    vlessTargets,
    core,
    cidr,
    scanProbes,
    geoHosts,
    geoAddresses,
    geoConfig,
    geoForm,
  ]);

  // Имена, которые бот возьмёт сам при пустом поле: домен цели; у IP имени нет.
  const autoSniNames = useMemo(
    () => (mode === 'ip' ? sniNamesForAddresses(ownTargets) : []),
    [mode, ownTargets],
  );
  const activeProbes = mode === 'cidr' ? scanProbes : probes;
  const showSni = mode !== 'vless' && activeProbes.sni;

  const adapter = useMemo(() => jobAdapterFor(kind), [kind]);
  const launch = useLaunch(
    body,
    status,
    (job) => {
      if (mode === 'geo') rememberGeoForm(geoForm);
      onRunning(job.id);
    },
    adapter,
  );
  const applyCityLimit = (limit: number) => changeGeoForm({ ...geoForm, cityLimit: limit });

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
        {mode === 'geo' && (
          <GeoLauncherForm
            hosts={geoHosts}
            onHostsChange={changeGeoHosts}
            addresses={geoAddresses}
            onAddressesChange={setGeoAddresses}
            config={geoConfig}
            configPicker={
              <SubscriptionTargets
                embedded={{
                  title: t('admin.reachability.geo.targets.configTitle'),
                  hint: t('admin.reachability.geo.targets.configHint'),
                }}
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
                selected={configIndexes.slice(0, 1)}
                onToggle={(index) => setConfigIndexes(configIndexes[0] === index ? [] : [index])}
                onSelectMany={(indexes) => setConfigIndexes(indexes.slice(0, 1))}
                onClear={() => setConfigIndexes([])}
              />
            }
            form={geoForm}
            onFormChange={changeGeoForm}
            core={core}
            onCoreChange={setCore}
            cores={status?.cores}
          />
        )}

        {mode === 'geo' ? null : mode === 'vless' ? (
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

        {mode !== 'geo' && (
          <OperatorPicker
            kind={kind}
            units={catalog}
            selected={units}
            onChange={setManualUnits}
            loading={unitsLoading}
          />
        )}
      </div>
      <div className="hidden lg:block">
        <LaunchAside launch={launch} onApplyCityLimit={applyCityLimit} />
      </div>
      <div className="lg:hidden">
        {launch.targetsCount > 0 && <LaunchBar launch={launch} onApplyCityLimit={applyCityLimit} />}
      </div>
    </div>
  );
}
