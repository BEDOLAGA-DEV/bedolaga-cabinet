import { useTranslation } from 'react-i18next';
import type {
  ReferenceStatus,
  SubscriptionConfigs as SubscriptionConfigsData,
  VlessCore,
} from '@/api/reachability';
import { XrayIcon } from '@/components/icons';
import { ChoiceChips } from './ChoiceChips';
import { SectionHeading } from './SectionHeading';
import { SubscriptionConfigs } from './SubscriptionConfigs';
import { SubscriptionSourcePicker } from './SubscriptionSourcePicker';
import { type CoreVersions, coreVersion } from './cores';

export interface SubscriptionTargetsProps {
  userId: number | null;
  shortUuid: string | null;
  onSource: (next: { userId: number | null; shortUuid: string | null }) => void;
  data: SubscriptionConfigsData | undefined;
  isLoading: boolean;
  error: unknown;
  selected: number[];
  onToggle: (index: number) => void;
  core: VlessCore;
  onCoreChange: (core: VlessCore) => void;
  reference: ReferenceStatus | null;
  cores: CoreVersions;
}

const CORES: readonly VlessCore[] = ['', 'stable', 'prerelease'];

/** Вкладка «Подписка»: откуда взять подписку, какие конфиги тестировать, каким ядром Xray. */
export function SubscriptionTargets(props: SubscriptionTargetsProps) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="reachability-targets" className="space-y-3">
      <SectionHeading
        id="reachability-targets"
        title={t('admin.reachability.sections.targets')}
        hint={t('admin.reachability.switch.vlessHint')}
        aside={t('admin.reachability.targets.count', { count: props.selected.length })}
      />
      <SubscriptionSourcePicker
        userId={props.userId}
        shortUuid={props.shortUuid}
        onSource={props.onSource}
        reference={props.reference}
      />
      <SubscriptionConfigs
        data={props.data}
        isLoading={props.isLoading}
        error={props.error}
        selected={props.selected}
        onToggle={props.onToggle}
      />
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
    </section>
  );
}
