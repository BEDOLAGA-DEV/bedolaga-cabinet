import type { UseQueryResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  ParsedInput,
  ReferenceStatus,
  RejectedConfig,
  SubscriptionConfig,
  SubscriptionConfigs as SubscriptionConfigsData,
  TargetIn,
} from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { SectionHeading } from './SectionHeading';
import { SubscriptionConfigs } from './SubscriptionConfigs';
import { SubscriptionInput } from './SubscriptionInput';
import { SubscriptionSourcePicker } from './SubscriptionSourcePicker';

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
  /** Внутри чужого блока целей (GEO): свой маленький заголовок вместо заголовка секции. */
  embedded?: { title: string; hint?: string };
}

/** Вкладка «VPN-тест»: подписка по умолчанию из настроек первой строкой, её серверы, ниже — свой конфиг или другая подписка. */
export function SubscriptionTargets(props: SubscriptionTargetsProps) {
  const { t } = useTranslation();
  const pastedMode = props.pasted.trim().length > 0;
  const loading = pastedMode
    ? props.parsed.isFetching && !props.parsed.data
    : props.subscription.isLoading;
  const sourceError = !pastedMode && props.subscription.error ? props.subscription.error : null;
  const showList = pastedMode ? Boolean(props.parsed.data) : Boolean(props.subscription.data);

  return (
    <section
      aria-labelledby={props.embedded ? undefined : 'reachability-targets'}
      aria-label={props.embedded?.title}
      className="space-y-4"
    >
      {props.embedded ? (
        <div>
          <h3 className="text-sm font-medium text-dark-200">{props.embedded.title}</h3>
          {props.embedded.hint && <p className="text-xs text-dark-400">{props.embedded.hint}</p>}
        </div>
      ) : (
        <SectionHeading
          id="reachability-targets"
          title={t('admin.reachability.sections.targets')}
          hint={t('admin.reachability.switch.vlessHint')}
          aside={t('admin.reachability.targets.count', { count: props.selected.length })}
        />
      )}
      {!pastedMode && (
        <SubscriptionSourcePicker
          userId={props.userId}
          shortUuid={props.shortUuid}
          onSource={props.onSource}
          reference={props.reference}
        />
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
          note={pastedMode ? null : (props.subscription.data?.note ?? null)}
          onToggle={props.onToggle}
          onSelectMany={props.onSelectMany}
          onClear={props.onClear}
        />
      )}
      <div className="space-y-1">
        <p className="text-xs text-dark-400">
          {t(
            pastedMode
              ? 'admin.reachability.subscription.fromInput'
              : 'admin.reachability.subscription.orPick',
          )}
        </p>
        <SubscriptionInput
          value={props.pasted}
          onChange={props.onPastedChange}
          parsed={props.parsed}
        />
      </div>
    </section>
  );
}
