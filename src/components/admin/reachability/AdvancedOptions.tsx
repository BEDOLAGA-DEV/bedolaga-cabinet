import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Probes, VlessCore } from '@/api/reachability';
import { ChevronDownIcon, XrayIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { ChoiceChips } from './ChoiceChips';
import { ProbesRow } from './ProbesRow';
import { SniHostsField } from './SniHostsField';
import { type CoreVersions, coreVersion } from './cores';
import { parseSniHosts } from './sniNames';

interface AdvancedOptionsProps {
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
const PROBE_NAMES: Array<keyof Probes> = ['icmp', 'tcp', 'sni'];

/**
 * «Дополнительно»: пробы, SNI-хост и ядро Xray свёрнуты в одну строку с текущими
 * значениями — умолчания уже правильные, раскрывать нужно редко.
 */
export function AdvancedOptions(props: AdvancedOptionsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const parts: string[] = [];
  if (props.probes) {
    const names = PROBE_NAMES.filter((name) => props.probes?.[name]).map((name) =>
      t(`admin.reachability.probes.${name}`),
    );
    parts.push(t('admin.reachability.advanced.probes', { probes: names.join(', ') }));
  }
  if (props.showSni && props.sniHosts !== undefined) {
    const names = parseSniHosts(props.sniHosts).names;
    parts.push(
      t('admin.reachability.advanced.sni', {
        sni: names.length > 0 ? names.join(', ') : (props.autoSniNames ?? []).join(', ') || '—',
      }),
    );
  }
  if (props.core !== undefined) {
    parts.push(
      t('admin.reachability.advanced.core', {
        core:
          props.core === ''
            ? t('admin.reachability.subscription.coreAuto')
            : coreVersion(props.cores, props.core),
      }),
    );
  }

  return (
    <section className="rounded-xl border border-dark-700/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 text-left"
      >
        <span className="min-w-0">
          <span className="text-sm font-medium text-dark-200">
            {t('admin.reachability.sections.more')}
          </span>
          <span className="ms-2 text-xs text-dark-400">{parts.join(' · ')}</span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            'h-4 w-4 shrink-0 text-dark-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-dark-700/60 p-3">
          {props.probes && props.onProbesChange && (
            <ProbesRow
              probes={props.probes}
              onChange={props.onProbesChange}
              locked={props.locked}
            />
          )}
          {props.showSni && props.sniHosts !== undefined && props.onSniChange && (
            <SniHostsField
              value={props.sniHosts}
              onChange={props.onSniChange}
              autoNames={props.autoSniNames ?? []}
            />
          )}
          {props.core !== undefined && props.onCoreChange && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-2 text-sm font-medium text-dark-200">
                <XrayIcon className="h-5 w-5 text-dark-300" />
                {t('admin.reachability.subscription.core')}
              </span>
              <ChoiceChips
                value={props.core}
                onChange={props.onCoreChange}
                label={t('admin.reachability.subscription.core')}
                options={CORES.map((value) => ({
                  value,
                  label:
                    value === ''
                      ? t('admin.reachability.subscription.coreAuto')
                      : coreVersion(props.cores, value),
                }))}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
