import { useTranslation } from 'react-i18next';
import type { SubscriptionConfigs as SubscriptionConfigsData, VlessCore } from '@/api/reachability';
import { ChevronDownIcon } from '@/components/icons';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { SectionHeading } from './SectionHeading';
import { SubscriptionConfigs } from './SubscriptionConfigs';
import { SubscriptionSourcePicker } from './SubscriptionSourcePicker';

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
}

const CORES: Array<{ value: VlessCore; key: string }> = [
  { value: '', key: 'coreAuto' },
  { value: 'stable', key: 'coreStable' },
  { value: 'prerelease', key: 'corePrerelease' },
];

/** Цели VLESS-теста: откуда взять подписку и какие конфиги тестировать. */
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
      />
      <SubscriptionConfigs
        data={props.data}
        isLoading={props.isLoading}
        error={props.error}
        selected={props.selected}
        onToggle={props.onToggle}
      />
      <details className="group rounded-xl border border-dark-700/60 bg-dark-900/30">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium text-dark-200">
          <span>
            {t('admin.reachability.sections.more')}
            <span className="ml-2 text-xs font-normal text-dark-400">
              {t('admin.reachability.subscription.core')}
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-dark-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-dark-700/60 p-3">
          <label className="block sm:w-64">
            <span className="text-sm font-medium text-dark-200">
              {t('admin.reachability.subscription.core')}
            </span>
            <div className="mt-1">
              <DropdownSelect
                value={props.core}
                onChange={(value) => props.onCoreChange(value as VlessCore)}
                options={CORES.map((item) => ({
                  value: item.value,
                  label: t(`admin.reachability.subscription.${item.key}`),
                }))}
              />
            </div>
          </label>
        </div>
      </details>
    </section>
  );
}
