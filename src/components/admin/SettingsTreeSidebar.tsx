import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SETTINGS_TREE } from './constants';
import { StarIcon, SearchIcon, CloseIcon, ChevronDownIcon } from './icons';
import { SettingDefinition } from '../../api/adminSettings';
import { formatSettingKey } from './utils';
import { cn } from '../../lib/utils';

interface SettingsTreeSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  favoritesCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allSettings?: SettingDefinition[];
  onSelectSetting?: (setting: SettingDefinition) => void;
  className?: string;
}

export function SettingsTreeSidebar({
  activeSection,
  onSectionChange,
  favoritesCount,
  searchQuery,
  onSearchChange,
  allSettings,
  onSelectSetting,
  className,
}: SettingsTreeSidebarProps) {
  const { t } = useTranslation();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-expand the group containing the active section
  useEffect(() => {
    for (const group of SETTINGS_TREE.groups) {
      if (group.children.some((child) => child.id === activeSection)) {
        setExpandedGroup(group.id);
        return;
      }
    }
  }, [activeSection]);

  // Filter settings for autocomplete
  const suggestions =
    searchQuery.trim() && allSettings
      ? allSettings
          .filter((s) => {
            const q = searchQuery.toLowerCase().trim();
            if (s.key.toLowerCase().includes(q)) return true;
            if (s.name?.toLowerCase().includes(q)) return true;
            const formattedKey = formatSettingKey(s.name || s.key);
            const translatedName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
            if (translatedName.toLowerCase().includes(q)) return true;
            if (s.hint?.description?.toLowerCase().includes(q)) return true;
            const categoryLabel = t(`admin.settings.categories.${s.category.key}`, s.category.key);
            if (categoryLabel.toLowerCase().includes(q)) return true;
            return false;
          })
          .slice(0, 8)
      : [];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsSearchOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectSuggestion = (setting: SettingDefinition) => {
    setIsSearchOpen(false);
    onSearchChange(setting.name || setting.key);
    onSelectSetting?.(setting);
  };

  const getSettingDisplayName = (setting: SettingDefinition) => {
    const formattedKey = formatSettingKey(setting.name || setting.key);
    return t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
  };

  const handleGroupToggle = (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      // Auto-select first child when expanding
      const group = SETTINGS_TREE.groups.find((g) => g.id === groupId);
      if (group && group.children.length > 0) {
        onSectionChange(group.children[0].id);
      }
    }
  };

  const isGroupActive = (groupId: string) => {
    const group = SETTINGS_TREE.groups.find((g) => g.id === groupId);
    return group?.children.some((child) => child.id === activeSection) ?? false;
  };

  // Special items excluding favorites (favorites is rendered separately)
  const customizationItems = SETTINGS_TREE.specialItems.filter((item) => item.id !== 'favorites');

  return (
    <nav className={cn('flex flex-col', className)}>
      {/* Search bar */}
      <div ref={searchContainerRef} className="relative px-3 pb-2 pt-3">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('admin.settings.searchPlaceholder')}
          className="w-full rounded-lg border border-dark-700/50 bg-dark-800/50 py-2 pl-9 pr-8 text-sm text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none"
        />
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-dark-500">
          <SearchIcon className="h-4 w-4" />
        </div>
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange('');
              setIsSearchOpen(false);
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-dark-500 transition-colors hover:text-dark-300"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}

        {/* Autocomplete dropdown */}
        {isSearchOpen && suggestions.length > 0 && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-dark-700 bg-dark-800 py-1 shadow-xl">
            {suggestions.map((setting, index) => (
              <button
                key={setting.key}
                onClick={() => handleSelectSuggestion(setting)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors',
                  index === highlightedIndex ? 'bg-accent-500/20' : 'hover:bg-dark-700/50',
                )}
              >
                <span className="truncate text-sm font-medium text-dark-100">
                  {getSettingDisplayName(setting)}
                </span>
                <span className="truncate text-xs text-dark-500">
                  {t(`admin.settings.categories.${setting.category.key}`, setting.category.key)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Favorites button */}
      <div className="px-3 pb-1">
        <button
          onClick={() => onSectionChange('favorites')}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all',
            activeSection === 'favorites'
              ? 'bg-accent-500/10 text-accent-400'
              : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
          )}
        >
          <StarIcon className="h-4 w-4" filled={activeSection === 'favorites'} />
          <span className="text-sm font-medium">{t('admin.settings.favorites', 'Favorites')}</span>
          {favoritesCount > 0 && (
            <span
              className={cn(
                'ml-auto rounded-full px-2 py-0.5 text-xs',
                activeSection === 'favorites'
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'bg-warning-500/20 text-warning-400',
              )}
            >
              {favoritesCount}
            </span>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-dark-700/50" />

      {/* Customization section label */}
      <div className="px-6 pb-1 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
          {t('admin.settings.customization', 'Customization')}
        </span>
      </div>

      {/* Special items (branding, theme, analytics, buttons) */}
      <div className="space-y-0.5 px-3 pb-1">
        {customizationItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all',
                isActive
                  ? 'bg-accent-500/10 text-accent-400'
                  : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
              )}
            >
              {item.icon && <span className="text-sm">{item.icon}</span>}
              <span className="text-sm font-medium">{t(`admin.settings.${item.id}`, item.id)}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-dark-700/50" />

      {/* Settings section label */}
      <div className="px-6 pb-1 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
          {t('admin.settings.settingsLabel', 'Settings')}
        </span>
      </div>

      {/* Tree groups */}
      <div className="space-y-0.5 px-3 pb-3">
        {SETTINGS_TREE.groups.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const hasActiveChild = isGroupActive(group.id);

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => handleGroupToggle(group.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all',
                  hasActiveChild
                    ? 'text-accent-300'
                    : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
                )}
              >
                <span className="text-sm">{group.icon}</span>
                <span className="flex-1 text-left text-sm font-medium">
                  {t(`admin.settings.groups.${group.id}`, group.id)}
                </span>
                <ChevronDownIcon
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isExpanded && 'rotate-180',
                  )}
                />
              </button>

              {/* Children */}
              {isExpanded && (
                <div className="relative ml-5 mt-0.5 space-y-0.5 border-l border-dark-700/50 pl-3">
                  {group.children.map((child) => {
                    const isActive = activeSection === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onSectionChange(child.id)}
                        className={cn(
                          'flex w-full items-center rounded-lg px-3 py-1.5 text-left text-sm transition-all',
                          isActive
                            ? 'bg-accent-500/10 text-accent-400'
                            : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
                        )}
                      >
                        {t(`admin.settings.tree.${child.id}`, child.id)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
