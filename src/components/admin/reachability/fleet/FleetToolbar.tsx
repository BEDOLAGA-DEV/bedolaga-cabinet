import { useTranslation } from 'react-i18next';
import { SearchIcon } from '@/components/icons';
import { ChoiceChips } from '../ChoiceChips';
import type { FleetCounts, FleetFilter } from './fleet';

interface FleetToolbarProps {
  counts: FleetCounts;
  filter: FleetFilter;
  onFilter: (filter: FleetFilter) => void;
  query: string;
  onQuery: (query: string) => void;
}

const FILTERS: readonly FleetFilter[] = ['all', 'problems', 'unchecked', 'bs', 'regular'];

function filterCount(counts: FleetCounts, filter: FleetFilter): number {
  switch (filter) {
    case 'problems':
      return counts.partial + counts.down;
    case 'unchecked':
      return counts.unchecked;
    case 'bs':
      return counts.bs;
    case 'regular':
      return counts.regular;
    default:
      return counts.total;
  }
}

/** Фильтры с числами (сразу видно, сколько проблемных) и поиск по имени или адресу. */
export function FleetToolbar({ counts, filter, onFilter, query, onQuery }: FleetToolbarProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability.fleet';
  const options = FILTERS.map((value) => ({
    value,
    label: t(`${base}.filter.${value}`, { count: filterCount(counts, value) }),
  }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ChoiceChips
        value={filter}
        onChange={onFilter}
        options={options}
        label={t(`${base}.filter.all`, { count: counts.total })}
      />
      <div className="flex items-center gap-3">
        <label className="relative block w-full md:w-64">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            aria-label={t(`${base}.search`)}
            placeholder={t(`${base}.search`)}
            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 py-2 pl-9 pr-3 text-sm text-dark-100 placeholder:text-dark-500 focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
        </label>
        <span className="hidden text-xs text-dark-400 md:inline">{t(`${base}.sort`)}</span>
      </div>
    </div>
  );
}
