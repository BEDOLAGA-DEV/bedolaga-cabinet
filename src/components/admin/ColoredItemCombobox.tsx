import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useHapticFeedback } from '../../platform/hooks/useHaptic';

const DEFAULT_COLORS = [
  '#00e5a0',
  '#00b4d8',
  '#f72585',
  '#ffd60a',
  '#7c3aed',
  '#f97316',
  '#06b6d4',
  '#ec4899',
];

interface ColoredItem {
  id: number;
  name: string;
  color: string;
}

interface ColoredItemComboboxProps {
  items: ColoredItem[];
  value: ColoredItem | null;
  onChange: (item: ColoredItem | null) => void;
  onCreateNew: (name: string, color: string) => Promise<ColoredItem>;
  onDelete?: (item: ColoredItem) => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  colors?: string[];
  className?: string;
}

export function ColoredItemCombobox({
  items,
  value,
  onChange,
  onCreateNew,
  onDelete,
  placeholder,
  isLoading = false,
  colors = DEFAULT_COLORS,
  className,
}: ColoredItemComboboxProps) {
  const { t } = useTranslation();
  const haptic = useHapticFeedback();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newColor, setNewColor] = useState(colors[0] ?? '#00e5a0');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filtered items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase().trim();
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, search]);

  // Whether search text matches an existing item exactly
  const hasExactMatch = useMemo(() => {
    const query = search.toLowerCase().trim();
    return query.length > 0 && items.some((item) => item.name.toLowerCase() === query);
  }, [items, search]);

  // Show create section when search text doesn't match existing items
  const showCreateSection = search.trim().length > 0 && !hasExactMatch;

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the dropdown to render
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    haptic.buttonPress();
    setIsOpen((prev) => !prev);
    setSearch('');
  }, [haptic]);

  const handleSelect = useCallback(
    (item: ColoredItem) => {
      haptic.selectionChanged();
      onChange(item);
      setIsOpen(false);
      setSearch('');
    },
    [onChange, haptic],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      haptic.buttonPress();
      onChange(null);
    },
    [onChange, haptic],
  );

  const handleCreate = useCallback(async () => {
    const name = search.trim();
    if (!name || isCreating) return;

    haptic.buttonPress();
    setIsCreating(true);

    try {
      const created = await onCreateNew(name, newColor);
      haptic.success();
      onChange(created);
      setIsOpen(false);
      setSearch('');
    } catch {
      haptic.error();
    } finally {
      setIsCreating(false);
    }
  }, [search, newColor, isCreating, onCreateNew, onChange, haptic]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, item: ColoredItem) => {
      e.stopPropagation();
      if (!onDelete || deletingId !== null) return;

      haptic.buttonPress();
      setDeletingId(item.id);

      try {
        await onDelete(item);
        haptic.success();
        // Clear selection if deleted item was selected
        if (value?.id === item.id) {
          onChange(null);
        }
      } catch {
        haptic.error();
      } finally {
        setDeletingId(null);
      }
    },
    [onDelete, deletingId, value, onChange, haptic],
  );

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
      if (e.key === 'Enter' && showCreateSection) {
        e.preventDefault();
        handleCreate();
      }
    },
    [showCreateSection, handleCreate],
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex min-h-[44px] w-full items-center gap-3 rounded-xl border bg-dark-800 px-4 py-2.5 text-left text-sm transition-colors',
          isOpen ? 'border-accent-500/50' : 'border-dark-700 hover:border-dark-600',
          isLoading && 'animate-pulse',
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {value ? (
          <>
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: value.color }}
            />
            <span className="flex-1 truncate text-dark-100">{value.name}</span>
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 rounded p-0.5 text-dark-500 transition-colors hover:text-dark-300"
              aria-label={t('news.admin.combobox.clear')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <span className="h-3 w-3 shrink-0 rounded-full bg-dark-600" />
            <span className="flex-1 truncate text-dark-500">
              {placeholder ?? t('news.admin.combobox.placeholder')}
            </span>
          </>
        )}
        <svg
          className={cn(
            'h-4 w-4 shrink-0 text-dark-500 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-dark-700 bg-dark-900/95 shadow-xl shadow-black/30 backdrop-blur-lg',
          )}
          role="listbox"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="border-b border-dark-700 p-3">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('news.admin.combobox.searchOrCreate')}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50"
            />
          </div>

          {/* Items list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredItems.length > 0 ? (
              <div className="p-1.5">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      value?.id === item.id
                        ? 'bg-accent-500/10 text-accent-400'
                        : 'text-dark-200 hover:bg-dark-800',
                    )}
                    role="option"
                    aria-selected={value?.id === item.id}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    {value?.id === item.id && (
                      <svg
                        className="h-4 w-4 shrink-0 text-accent-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item)}
                        disabled={deletingId === item.id}
                        className="shrink-0 rounded p-1 text-dark-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        aria-label={t('news.admin.combobox.delete', { name: item.name })}
                      >
                        {deletingId === item.id ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                        ) : (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              !showCreateSection && (
                <div className="px-4 py-6 text-center text-sm text-dark-500">
                  {t('news.admin.combobox.noItems')}
                </div>
              )
            )}
          </div>

          {/* Create new section */}
          {showCreateSection && (
            <div className="border-t border-dark-700 p-3">
              <div className="mb-2.5 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('news.admin.combobox.createNew')}
              </div>

              {/* Name preview */}
              <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-dark-800 px-3 py-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: newColor }}
                />
                <span className="text-sm text-dark-200">{search.trim()}</span>
              </div>

              {/* Color swatches */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      haptic.selectionChanged();
                      setNewColor(color);
                    }}
                    className={cn(
                      'h-8 w-8 rounded-lg border-2 transition-all',
                      newColor === color
                        ? 'scale-110 border-white'
                        : 'border-transparent hover:border-dark-500',
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={t('news.admin.selectColor', { color })}
                  />
                ))}
              </div>

              {/* Create button */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    {t('news.admin.combobox.create')}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { ColoredItem, ColoredItemComboboxProps };
