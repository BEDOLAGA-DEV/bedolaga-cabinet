import { useTranslation } from 'react-i18next';
import { XIcon } from '@/components/icons';
import { type FilterField, type FilterKey, currentLabel } from './FiltersPopover';

interface AppliedFiltersProps {
  fields: FilterField[];
  onRemove: (key: FilterKey) => void;
  onResetAll: () => void;
}

/** «Подписка: истекла ✕» — что сейчас сужает список; крестик убирает один фильтр. */
export function AppliedFilters({ fields, onRemove, onResetAll }: AppliedFiltersProps) {
  const { t } = useTranslation();
  const applied = fields.filter((field) => field.value !== '');
  if (applied.length === 0) return null;

  return (
    <div className="scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {applied.map((field) => (
        <span
          key={field.key}
          className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-accent-500/10 pl-3 pr-1 text-sm ring-1 ring-inset ring-accent-500/30"
        >
          <span className="text-dark-400">{field.label}:</span>
          <span className="font-medium text-accent-400">{currentLabel(field)}</span>
          <button
            type="button"
            onClick={() => onRemove(field.key)}
            aria-label={t('admin.users.filters.remove', { name: field.label })}
            className="flex h-6 w-6 items-center justify-center rounded-md text-accent-400 transition-colors hover:bg-accent-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onResetAll}
        className="h-8 shrink-0 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium text-dark-400 transition-colors hover:text-dark-100"
      >
        {t('admin.users.reset')}
      </button>
    </div>
  );
}
