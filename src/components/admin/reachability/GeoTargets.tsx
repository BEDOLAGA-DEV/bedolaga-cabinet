import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HostTarget } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { PurposeChip } from './PurposeChip';
import { SectionHeading } from './SectionHeading';
import { CheckGlyph, ROW, ROW_BUTTON, ROW_OFF, ROW_ON } from './SelectableRow';
import { MAX_GEO_TARGETS } from './geoForm';
import { useHosts } from './useTargets';

export interface GeoTargetsProps {
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

/** Цели GEO из трёх источников: хосты панели галочками, свои адреса текстом, один конфиг туннеля. */
export function GeoTargets(props: GeoTargetsProps) {
  const { t } = useTranslation();
  const { data: hosts = [], isLoading } = useHosts();
  const [search, setSearch] = useState('');
  const parsed = useMemo(() => parseGeoAddresses(props.addresses), [props.addresses]);
  const total = props.hosts.length + parsed.targets.length + props.configCount;
  const needle = search.trim().toLowerCase();
  const shown = hosts.filter((host) =>
    `${host.remark} ${host.address}`.toLowerCase().includes(needle),
  );
  const toggle = (uuid: string) =>
    props.onHostsChange(
      props.hosts.includes(uuid)
        ? props.hosts.filter((item) => item !== uuid)
        : [...props.hosts, uuid],
    );

  return (
    <section aria-labelledby="reachability-targets" className="space-y-4">
      <SectionHeading
        id="reachability-targets"
        title={t('admin.reachability.sections.targets')}
        hint={t('admin.reachability.switch.geoHint')}
        aside={t('admin.reachability.geo.targets.count', { count: total, max: MAX_GEO_TARGETS })}
      />
      {total > MAX_GEO_TARGETS && (
        <p className="text-xs text-warning-400">
          {t('admin.reachability.geo.targets.overLimit', { max: MAX_GEO_TARGETS })}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-dark-200">
            {t('admin.reachability.targets.hosts')}
          </h3>
          {hosts.length > SEARCH_FROM && (
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t('admin.reachability.targets.search')}
              placeholder={t('admin.reachability.targets.search')}
              className="input w-40 text-sm"
            />
          )}
        </div>
        {isLoading && <p className="mt-2 text-xs text-dark-400">…</p>}
        <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {shown.map((host) => (
            <HostRow
              key={host.uuid}
              host={host}
              checked={props.hosts.includes(host.uuid)}
              onToggle={() => toggle(host.uuid)}
            />
          ))}
        </ul>
      </div>

      <div>
        <label
          htmlFor="reachability-geo-addresses"
          className="block text-sm font-medium text-dark-200"
        >
          {t('admin.reachability.addresses.label')}
        </label>
        <textarea
          id="reachability-geo-addresses"
          value={props.addresses}
          onChange={(event) => props.onAddressesChange(event.target.value)}
          rows={3}
          placeholder={t('admin.reachability.geo.targets.placeholder')}
          className="input mt-1.5 w-full font-mono text-sm"
        />
        <p className="mt-1.5 text-xs text-dark-400">{t('admin.reachability.geo.targets.hint')}</p>
        {parsed.hasCidr && (
          <p className="mt-1 text-xs text-warning-400">
            {t('admin.reachability.geo.targets.noCidr')}
          </p>
        )}
      </div>

      {props.configPicker}
    </section>
  );
}
