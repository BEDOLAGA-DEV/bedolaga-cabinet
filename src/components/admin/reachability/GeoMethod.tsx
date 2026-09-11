import { useTranslation } from 'react-i18next';
import type { GeoProbeMode, VlessCore } from '@/api/reachability';
import { ChoiceChips } from './ChoiceChips';
import { SectionHeading } from './SectionHeading';
import { type CoreVersions, coreVersion } from './cores';
import type { GeoFormState } from './geoForm';

export interface GeoMethodProps {
  value: GeoFormState;
  onChange: (next: GeoFormState) => void;
  core: VlessCore;
  onCoreChange: (core: VlessCore) => void;
  cores: CoreVersions;
  /** Есть доменная сайт-цель или туннель — «тяжёлую» пробу можно включить. */
  heavyAllowed: boolean;
  /** Выбраны хосты панели — подсказка, почему по умолчанию TCP. */
  hostsSelected: boolean;
  /** В запуске есть конфиг туннеля — показать выбор ядра. */
  hasTunnel: boolean;
}

/** Блок «Метод»: TCP-порт или TLS-хендшейк, «тяжёлая» проба троттлинга, ядро Xray для туннеля. */
export function GeoMethod(props: GeoMethodProps) {
  const { t } = useTranslation();
  const patch = (fields: Partial<GeoFormState>) => props.onChange({ ...props.value, ...fields });
  const tcp = props.value.probeMode === 'tcp';
  const heavyOn = props.value.heavy && !tcp && props.heavyAllowed;
  return (
    <section aria-labelledby="reachability-geo-method" className="space-y-3">
      <SectionHeading
        id="reachability-geo-method"
        title={t('admin.reachability.geo.method.title')}
      />
      <ChoiceChips<GeoProbeMode>
        label={t('admin.reachability.geo.method.label')}
        value={props.value.probeMode}
        options={[
          { value: 'tcp', label: t('admin.reachability.geo.method.tcp') },
          { value: 'tls', label: t('admin.reachability.geo.method.tls') },
        ]}
        onChange={(probeMode) => patch({ probeMode })}
      />
      <p className="text-xs text-dark-400">
        {t(tcp ? 'admin.reachability.geo.method.tcpHint' : 'admin.reachability.geo.method.tlsHint')}
      </p>
      {props.hostsSelected && (
        <p className="text-xs text-dark-400">{t('admin.reachability.geo.method.hostsHint')}</p>
      )}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={heavyOn}
          disabled={tcp || !props.heavyAllowed}
          onChange={(event) => patch({ heavy: event.target.checked })}
          className="mt-1"
        />
        <span>
          <span className="block text-sm text-dark-100">
            {t('admin.reachability.geo.method.heavy')}
          </span>
          <span className="block text-xs text-dark-400">
            {t('admin.reachability.geo.method.heavyHint')}
          </span>
        </span>
      </label>
      {props.hasTunnel && (
        <ChoiceChips<VlessCore>
          label={t('admin.reachability.subscription.core')}
          showLabel
          value={props.core}
          options={[
            { value: '', label: t('admin.reachability.subscription.coreAuto') },
            {
              value: 'stable',
              label: `${t('admin.reachability.subscription.coreStable')} ${coreVersion(props.cores, 'stable')}`,
            },
            {
              value: 'prerelease',
              label: `${t('admin.reachability.subscription.corePrerelease')} ${coreVersion(props.cores, 'prerelease')}`,
            },
          ]}
          onChange={props.onCoreChange}
        />
      )}
    </section>
  );
}
