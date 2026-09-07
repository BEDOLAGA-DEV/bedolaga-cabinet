import { useTranslation } from 'react-i18next';
import { ChoiceChips } from '../ChoiceChips';
import type { FleetCounts, FleetFilter } from './fleet';

interface FleetToolbarProps {
  counts: FleetCounts;
  filter: FleetFilter;
  onFilter: (filter: FleetFilter) => void;
}

const FILTERS: readonly FleetFilter[] = ['all', 'problems', 'stale', 'bs', 'regular'];

function filterCount(counts: FleetCounts, filter: FleetFilter): number {
  switch (filter) {
    case 'problems':
      return counts.partial + counts.down;
    case 'stale':
      return counts.stale;
    case 'bs':
      return counts.bs;
    case 'regular':
      return counts.regular;
    default:
      return counts.total;
  }
}

/**
 * Фильтры с числами одной строкой (сразу видно, сколько проблемных): на телефоне строка
 * прокручивается вбок до краёв экрана, на десктопе помещается целиком. Поиск живёт в шапке таблицы.
 */
export function FleetToolbar({ counts, filter, onFilter }: FleetToolbarProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability.fleet';
  const options = FILTERS.map((value) => ({
    value,
    label: t(`${base}.filter.${value}`),
    count: filterCount(counts, value),
  }));
  return (
    <ChoiceChips
      value={filter}
      onChange={onFilter}
      options={options}
      label={t(`${base}.targets`)}
      className="-mx-4 flex-nowrap overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    />
  );
}
