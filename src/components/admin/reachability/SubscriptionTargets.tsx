import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  ParsedInput,
  ReferenceStatus,
  RejectedConfig,
  SubscriptionConfig,
  SubscriptionConfigs as SubscriptionConfigsData,
  TargetIn,
  VlessCore,
} from '@/api/reachability';
import { XrayIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from './ChoiceChips';
import { SectionHeading } from './SectionHeading';
import { SubscriptionConfigs } from './SubscriptionConfigs';
import { SubscriptionInput } from './SubscriptionInput';
import { SubscriptionSourcePicker } from './SubscriptionSourcePicker';
import { type CoreVersions, coreVersion } from './cores';

/** Конфиг из любого источника с готовой целью для задачи. */
export type ConfigItem = SubscriptionConfig & { target: TargetIn };

export interface SubscriptionTargetsProps {
  pasted: string;
  onPastedChange: (text: string) => void;
  parsed: UseQueryResult<ParsedInput>;
  userId: number | null;
  shortUuid: string | null;
  onSource: (next: { userId: number | null; shortUuid: string | null }) => void;
  subscription: UseQueryResult<SubscriptionConfigsData>;
  reference: ReferenceStatus | null;
  /** Активный список: из поля выше, если оно заполнено, иначе подписка панели. */
  list: ConfigItem[];
  rejected: RejectedConfig[];
  selected: number[];
  onToggle: (index: number) => void;
  onSelectMany: (indexes: number[]) => void;
  onClear: () => void;
  core: VlessCore;
  onCoreChange: (core: VlessCore) => void;
  cores: CoreVersions;
}

const CORES: readonly VlessCore[] = ['', 'stable', 'prerelease'];

/** Вкладка «Подписка»: поле «Конфиг или подписка», готовые источники, серверы, ядро Xray. */
export function SubscriptionTargets(props: SubscriptionTargetsProps) {
  const { t } = useTranslation();
  const pastedMode = props.pasted.trim().length > 0;
  const loading = pastedMode
    ? props.parsed.isFetching && !props.parsed.data
    : props.subscription.isLoading;
  const sourceError = !pastedMode && props.subscription.error ? props.subscription.error : null;
  const showList = pastedMode ? Boolean(props.parsed.data) : Boolean(props.subscription.data);

  return (
    <section aria-labelledby="reachability-targets" className="space-y-4">
      <SectionHeading
        id="reachability-targets"
        title={t('admin.reachability.sections.targets')}
        hint={t('admin.reachability.switch.vlessHint')}
        aside={t('admin.reachability.targets.count', { count: props.selected.length })}
      />
      <SubscriptionInput
        value={props.pasted}
        onChange={props.onPastedChange}
        parsed={props.parsed}
      />
      {pastedMode ? (
        <p className="text-xs text-dark-400">{t('admin.reachability.subscription.fromInput')}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-dark-400">{t('admin.reachability.subscription.orPick')}</p>
          <SubscriptionSourcePicker
            userId={props.userId}
            shortUuid={props.shortUuid}
            onSource={props.onSource}
            reference={props.reference}
          />
        </div>
      )}
      {loading && (
        <SkeletonGroup aria-label={t('admin.reachability.subscription.title')}>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </SkeletonGroup>
      )}
      {sourceError && (
        <p className="text-sm text-error-400">{getApiErrorMessage(sourceError, '')}</p>
      )}
      {showList && !loading && (
        <SubscriptionConfigs
          configs={props.list}
          rejected={props.rejected}
          selected={props.selected}
          onToggle={props.onToggle}
          onSelectMany={props.onSelectMany}
          onClear={props.onClear}
        />
      )}
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
