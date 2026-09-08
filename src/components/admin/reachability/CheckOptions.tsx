import { useTranslation } from 'react-i18next';
import type { Probes, VlessCore } from '@/api/reachability';
import { ChoiceChips } from './ChoiceChips';
import { ProbesRow } from './ProbesRow';
import { SectionHeading } from './SectionHeading';
import { SniHostsField } from './SniHostsField';
import { type CoreVersions, coreVersion } from './cores';

interface CheckOptionsProps {
  probes?: Probes;
  onProbesChange?: (probes: Probes) => void;
  locked?: Array<keyof Probes>;
  sniHosts?: string;
  onSniChange?: (value: string) => void;
  autoSniNames?: string[];
  showSni?: boolean;
  core?: VlessCore;
  onCoreChange?: (core: VlessCore) => void;
  cores?: CoreVersions;
}

const CORES: readonly VlessCore[] = ['', 'stable', 'prerelease'];

/**
 * Настройки проверки на виду, как в оригинале bsbord.com: пробы ICMP · TCP · TLS-SNI с
 * пояснениями, под ними поле «SNI-хост» (пока включена SNI-проба), для подписки — ядро Xray.
 */
export function CheckOptions(props: CheckOptionsProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability';
  return (
    <section className="space-y-5">
      {props.probes && props.onProbesChange && (
        <div className="space-y-3">
          <SectionHeading title={t(`${base}.probes.title`)} />
          <ProbesRow probes={props.probes} onChange={props.onProbesChange} locked={props.locked} />
          {props.showSni && props.sniHosts !== undefined && props.onSniChange && (
            <SniHostsField
              value={props.sniHosts}
              onChange={props.onSniChange}
              autoNames={props.autoSniNames ?? []}
            />
          )}
        </div>
      )}
      {props.core !== undefined && props.onCoreChange && (
        <div className="space-y-3">
          <SectionHeading title={t(`${base}.subscription.core`)} />
          <ChoiceChips
            value={props.core}
            onChange={props.onCoreChange}
            label={t(`${base}.subscription.core`)}
            options={CORES.map((value) => ({
              value,
              label:
                value === '' ? t(`${base}.subscription.coreAuto`) : coreVersion(props.cores, value),
            }))}
          />
        </div>
      )}
    </section>
  );
}
