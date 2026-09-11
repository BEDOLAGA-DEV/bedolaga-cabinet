import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HostTarget } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { ChoiceChips } from './ChoiceChips';
import { PurposeChip } from './PurposeChip';
import { SectionHeading } from './SectionHeading';
import { CheckGlyph, ROW, ROW_BUTTON, ROW_OFF, ROW_ON } from './SelectableRow';
import { type GeoTargetKind, MAX_GEO_TARGETS } from './geoForm';
import { useHosts } from './useTargets';

export interface GeoTargetsProps {
  /** Что проверяем — одно из трёх, как вкладки «IP / Домен» и «VLESS» у оригинала. */
  kind: GeoTargetKind;
  onKindChange: (kind: GeoTargetKind) => void;
  hosts: string[];
  onHostsChange: (uuids: string[]) => void;
  addresses: string;
  onAddressesChange: (text: string) => void;
  /** Сколько конфигов выбрано снаружи (0 или 1). */
  configCount: number;
  /** Блок выбора одного конфига из подписки или вставленной ссылки. */
  configPicker: ReactNode;
}

const CIDR_RE = /\/\d{1,2}\b/;
/** Поиск по хостам появляется, когда список длиннее экрана. */
const SEARCH_FROM = 8;
export const GEO_TARGET_KINDS: readonly GeoTargetKind[] = ['hosts', 'addresses', 'vless'];

/** Адреса через запятую или построчно, без дублей; подсети отделяются — их GEO не проверяет. */
export function parseGeoAddresses(text: string): { targets: string[]; hasCidr: boolean } {
  const unique = [
    ...new Set(
      text
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  return {
    targets: unique.filter((item) => !CIDR_RE.test(item)),
    hasCidr: unique.some((item) => CIDR_RE.test(item)),
  };
}

/** Сколько целей уйдёт в запуск при выбранном виде: другие виды не считаются. */
export function geoTargetsCount(
  kind: GeoTargetKind,
  counts: { hosts: number; addresses: number; configs: number },
): number {
  if (kind === 'hosts') return counts.hosts;
  if (kind === 'addresses') return counts.addresses;
  return counts.configs;
}

function HostRow({
  host,
  checked,
  onToggle,
}: {
  host: HostTarget;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={cn(ROW, checked ? ROW_ON : ROW_OFF)}>
      <button type="button" aria-pressed={checked} onClick={onToggle} className={ROW_BUTTON}>
        <CheckGlyph on={checked} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-dark-100">{host.remark}</span>
          <span className="block truncate font-mono text-xs text-dark-400">{host.target_key}</span>
        </span>
      </button>
      <PurposeChip purpose={host.purpose} />
    </li>
  );
}

function HostList({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (uuids: string[]) => void;
}) {
  const { t } = useTranslation();
  const { data: hosts = [], isLoading } = useHosts();
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const shown = hosts.filter((host) =>
    `${host.remark} ${host.address}`.toLowerCase().includes(needle),
  );
  const toggle = (uuid: string) =>
    onChange(
      selected.includes(uuid) ? selected.filter((item) => item !== uuid) : [...selected, uuid],
    );
  return (
    <div>
      {hosts.length > SEARCH_FROM && (
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={t('admin.reachability.targets.search')}
          placeholder={t('admin.reachability.targets.search')}
          className="input w-full text-sm"
        />
      )}
      {isLoading && <p className="mt-2 text-xs text-dark-400">…</p>}
      <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {shown.map((host) => (
          <HostRow
            key={host.uuid}
            host={host}
            checked={selected.includes(host.uuid)}
            onToggle={() => toggle(host.uuid)}
          />
        ))}
      </ul>
    </div>
  );
}

function AddressField({
  value,
  onChange,
  hasCidr,
}: {
  value: string;
  onChange: (text: string) => void;
  hasCidr: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor="reachability-geo-addresses" className="sr-only">
        {t('admin.reachability.addresses.label')}
      </label>
      <textarea
        id="reachability-geo-addresses"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={t('admin.reachability.geo.targets.placeholder')}
        className="input w-full font-mono text-sm"
      />
      <p className="mt-1.5 text-xs text-dark-400">{t('admin.reachability.geo.targets.hint')}</p>
      {hasCidr && (
        <p className="mt-1 text-xs text-warning-400">
          {t('admin.reachability.geo.targets.noCidr')}
        </p>
      )}
    </div>
  );
}

/**
 * Цели GEO — один вид за раз: хосты панели галочками, свои адреса текстом или один конфиг
 * туннеля. Переключатель как у оригинала bsbord.com («IP / Домен» · «VLESS»), плюс хосты панели,
 * ради которых кабинет и существует.
 */
export function GeoTargets(props: GeoTargetsProps) {
  const { t } = useTranslation();
  const parsed = useMemo(() => parseGeoAddresses(props.addresses), [props.addresses]);
  const total = geoTargetsCount(props.kind, {
    hosts: props.hosts.length,
    addresses: parsed.targets.length,
    configs: props.configCount,
  });
  const base = 'admin.reachability.geo.targets';

  return (
    <section aria-labelledby="reachability-targets" className="space-y-4">
      <SectionHeading
        id="reachability-targets"
        title={t('admin.reachability.sections.targets')}
        hint={t(`${base}.kindHint.${props.kind}`)}
        aside={t(`${base}.count`, { count: total, max: MAX_GEO_TARGETS })}
      />
      <ChoiceChips<GeoTargetKind>
        label={t(`${base}.kindLabel`)}
        value={props.kind}
        options={GEO_TARGET_KINDS.map((kind) => ({
          value: kind,
          label: t(`${base}.kinds.${kind}`),
        }))}
        onChange={props.onKindChange}
      />
      {total > MAX_GEO_TARGETS && (
        <p className="text-xs text-warning-400">
          {t(`${base}.overLimit`, { max: MAX_GEO_TARGETS })}
        </p>
      )}
      {props.kind === 'hosts' && <HostList selected={props.hosts} onChange={props.onHostsChange} />}
      {props.kind === 'addresses' && (
        <AddressField
          value={props.addresses}
          onChange={props.onAddressesChange}
          hasCidr={parsed.hasCidr}
        />
      )}
      {props.kind === 'vless' && props.configPicker}
    </section>
  );
}
