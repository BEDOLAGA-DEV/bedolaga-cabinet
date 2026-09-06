import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobKind } from '@/api/reachability';
import { OperatorPicker } from './OperatorPicker';
import { describeUnits } from './autoUnits';
import { useUnits } from './useUnits';

interface UnitsSummaryProps {
  kind: JobKind;
  selected: string[];
  /** Набор подобран сам по назначению целей; false — человек менял руками. */
  auto: boolean;
  onChange: (keys: string[]) => void;
  onReset: () => void;
}

/**
 * Симки одной строкой: «15 симок с Белым списком · по назначению целей · Изменить».
 * Список операторов открывается только по «Изменить»; ручной набор сбрасывается «Как по целям».
 */
export function UnitsSummary({ kind, selected, auto, onChange, onReset }: UnitsSummaryProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: catalog = [] } = useUnits();
  const info = describeUnits(selected, catalog);
  const summary =
    info.total === 0
      ? t('admin.reachability.unitsSummary.none')
      : info.regular === 0
        ? t('admin.reachability.unitsSummary.bs', { count: info.total })
        : info.bs === 0
          ? t('admin.reachability.unitsSummary.regular', { count: info.total })
          : t('admin.reachability.unitsSummary.mixed', {
              count: info.total,
              bs: info.bs,
              regular: info.regular,
            });

  return (
    <section aria-labelledby="reachability-units" className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="reachability-units" className="text-lg font-semibold text-dark-100">
          {t('admin.reachability.unitsSummary.title')}
        </h2>
        <span className="text-sm text-dark-100">{summary}</span>
        {info.total > 0 && (
          <span className="text-xs text-dark-400">
            {t(
              auto
                ? 'admin.reachability.unitsSummary.auto'
                : 'admin.reachability.unitsSummary.manual',
            )}
          </span>
        )}
        {!auto && (
          <button
            type="button"
            className="text-sm text-accent-400 hover:underline"
            onClick={onReset}
          >
            {t('admin.reachability.unitsSummary.reset')}
          </button>
        )}
        <button
          type="button"
          aria-expanded={open}
          className="text-sm text-accent-400 hover:underline"
          onClick={() => setOpen((value) => !value)}
        >
          {t(
            open ? 'admin.reachability.unitsSummary.hide' : 'admin.reachability.unitsSummary.edit',
          )}
        </button>
      </div>
      {open && <OperatorPicker kind={kind} selected={selected} onChange={onChange} />}
    </section>
  );
}
