import type { ReactNode } from 'react';
import type { TargetIn, VlessCore } from '@/api/reachability';
import { GeoMethod } from './GeoMethod';
import { GeoScope } from './GeoScope';
import { GeoTargets, parseGeoAddresses } from './GeoTargets';
import type { CoreVersions } from './cores';
import type { GeoFormState } from './geoForm';

export interface GeoLauncherProps {
  hosts: string[];
  onHostsChange: (uuids: string[]) => void;
  addresses: string;
  onAddressesChange: (text: string) => void;
  /** Один конфиг туннеля (или null) и блок его выбора — из общей логики подписки в Launcher. */
  config: TargetIn | null;
  configPicker: ReactNode;
  form: GeoFormState;
  onFormChange: (next: GeoFormState) => void;
  core: VlessCore;
  onCoreChange: (core: VlessCore) => void;
  cores: CoreVersions;
}

/** Похоже на домен (есть буквы до порта): «тяжёлую» пробу по голому IP не меряют. */
export const isDomainLike = (value: string): boolean =>
  /[a-zA-Zа-яёА-ЯЁ]/.test(value.split(':')[0]);

/** Вкладка GEO: цели трёх источников, «откуда», метод — три блока в порядке оригинала. */
export function GeoLauncherForm(props: GeoLauncherProps) {
  const parsed = parseGeoAddresses(props.addresses);
  const hasTunnel = props.config !== null;
  return (
    <>
      <GeoTargets
        hosts={props.hosts}
        onHostsChange={props.onHostsChange}
        addresses={props.addresses}
        onAddressesChange={props.onAddressesChange}
        configCount={hasTunnel ? 1 : 0}
        configPicker={props.configPicker}
      />
      <GeoScope value={props.form} onChange={props.onFormChange} />
      <GeoMethod
        value={props.form}
        onChange={props.onFormChange}
        core={props.core}
        onCoreChange={props.onCoreChange}
        cores={props.cores}
        heavyAllowed={hasTunnel || parsed.targets.some(isDomainLike)}
        hostsSelected={props.hosts.length > 0}
        hasTunnel={hasTunnel}
      />
    </>
  );
}
