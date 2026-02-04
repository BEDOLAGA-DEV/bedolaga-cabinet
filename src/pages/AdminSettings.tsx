import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminSettingsApi, SettingDefinition } from '../api/adminSettings';
import { themeColorsApi } from '../api/themeColors';
import { useFavoriteSettings } from '../hooks/useFavoriteSettings';
import { MENU_SECTIONS, MenuItem, formatSettingKey } from '../components/admin';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';
import { AnalyticsTab } from '../components/admin/AnalyticsTab';
import { BrandingTab } from '../components/admin/BrandingTab';
import { ThemeTab } from '../components/admin/ThemeTab';
import { FavoritesTab } from '../components/admin/FavoritesTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { SettingsMobileTabs } from '../components/admin/SettingsMobileTabs';
import {
  SettingsSearch,
  SettingsSearchMobile,
  SettingsSearchResults,
} from '../components/admin/SettingsSearch';

// BackIcon
const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

// Find section ID by category key
function findSectionByCategory(categoryKey: string): string | null {
  for (const section of MENU_SECTIONS) {
    for (const item of section.items) {
      if (item.categories?.includes(categoryKey)) {
        return item.id;
      }
    }
  }
  return null;
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  // State
  const [activeSection, setActiveSection] = useState('branding');
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites hook
  const { favorites, toggleFavorite, isFavorite } = useFavoriteSettings();

  // Scroll to top on section change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSection]);

  // Queries
  const { data: themeColors } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: themeColorsApi.getColors,
  });

  const { data: allSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.getSettings(),
  });

  // Get current menu item configuration
  const currentMenuItem = useMemo(() => {
    for (const section of MENU_SECTIONS) {
      const item = section.items.find((i: MenuItem) => i.id === activeSection);
      if (item) return item;
    }
    return null;
  }, [activeSection]);

  // Get categories for current section
  const currentCategories = useMemo(() => {
    if (!currentMenuItem?.categories || !allSettings || !Array.isArray(allSettings)) return [];

    const categoryMap = new Map<string, SettingDefinition[]>();

    for (const setting of allSettings) {
      if (currentMenuItem.categories.includes(setting.category.key)) {
        if (!categoryMap.has(setting.category.key)) {
          categoryMap.set(setting.category.key, []);
        }
        categoryMap.get(setting.category.key)!.push(setting);
      }
    }

    return Array.from(categoryMap.entries()).map(([key, settings]) => ({
      key,
      label: t(`admin.settings.categories.${key}`, key),
      settings,
    }));
  }, [currentMenuItem, allSettings, t]);

  // Filter settings for search - GLOBAL search across all settings
  const filteredSettings = useMemo(() => {
    if (!allSettings || !Array.isArray(allSettings) || !searchQuery) return [];

    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    return allSettings.filter((s: SettingDefinition) => {
      // Search by key
      if (s.key.toLowerCase().includes(q)) return true;

      // Search by original name
      if (s.name?.toLowerCase().includes(q)) return true;

      // Search by translated name
      const formattedKey = formatSettingKey(s.name || s.key);
      const translatedName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
      if (translatedName.toLowerCase().includes(q)) return true;

      // Search by description
      if (s.hint?.description?.toLowerCase().includes(q)) return true;

      // Search by category
      const categoryLabel = t(`admin.settings.categories.${s.category.key}`, s.category.key);
      if (categoryLabel.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [allSettings, searchQuery, t]);

  // Favorite settings
  const favoriteSettings = useMemo(() => {
    if (!allSettings || !Array.isArray(allSettings)) return [];
    return allSettings.filter((s: SettingDefinition) => favorites.includes(s.key));
  }, [allSettings, favorites]);

  // Handle setting selection from autocomplete
  const handleSelectSetting = useCallback(
    (setting: SettingDefinition) => {
      const sectionId = findSectionByCategory(setting.category.key);
      if (sectionId) {
        setActiveSection(sectionId);
      }
      // Set search to setting key to filter to just this setting
      setSearchQuery(setting.key);
    },
    [setActiveSection, setSearchQuery],
  );

  // Render content based on active section
  const renderContent = () => {
    // If searching, always show search results regardless of active section
    if (searchQuery.trim()) {
      return (
        <SettingsTab
          categories={[]}
          searchQuery={searchQuery}
          filteredSettings={filteredSettings}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
        />
      );
    }

    switch (activeSection) {
      case 'analytics':
        return <AnalyticsTab />;
      case 'branding':
        return <BrandingTab accentColor={themeColors?.accent} />;
      case 'theme':
        return <ThemeTab />;
      case 'favorites':
        return (
          <FavoritesTab
            settings={favoriteSettings}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
          />
        );
      default:
        if (
          [
            'payments',
            'subscriptions',
            'interface',
            'notifications',
            'database',
            'system',
            'users',
          ].includes(activeSection)
        ) {
          return (
            <SettingsTab
              categories={currentCategories}
              searchQuery={searchQuery}
              filteredSettings={filteredSettings}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          );
        }
        return null;
    }
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="space-y-4 lg:hidden">
        <SettingsMobileTabs
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          favoritesCount={favorites.length}
        />
        <SettingsSearchMobile
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          allSettings={allSettings}
          onSelectSetting={handleSelectSetting}
        />
        <SettingsSearchResults searchQuery={searchQuery} resultsCount={filteredSettings.length} />
        {renderContent()}
      </div>

      {/* Desktop Layout - fixed sidebar, scrollable content */}
      <div className="hidden h-[calc(100vh-120px)] lg:flex">
        {/* Fixed Sidebar */}
        <div className="w-64 shrink-0 overflow-y-auto border-r border-dark-700/50">
          <div className="border-b border-dark-700/50 p-4">
            <div className="flex items-center gap-3">
              {/* Show back button only on web, not in Telegram Mini App */}
              {!capabilities.hasBackButton && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
                >
                  <BackIcon />
                </button>
              )}
              <h1 className="text-lg font-bold text-dark-100">{t('admin.settings.title')}</h1>
            </div>
          </div>
          <nav className="space-y-1 p-2">
            {MENU_SECTIONS.map((section, sectionIdx) => (
              <div key={section.id}>
                {sectionIdx > 0 && <div className="my-3 border-t border-dark-700/50" />}
                {section.items.map((item) => {
                  const isActive = activeSection === item.id;
                  const hasIcon = item.iconType === 'star';
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                        isActive
                          ? 'bg-accent-500/10 text-accent-400'
                          : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200'
                      }`}
                    >
                      {hasIcon && (
                        <svg
                          className={`h-4 w-4 ${isActive ? 'fill-current' : ''}`}
                          fill={isActive ? 'currentColor' : 'none'}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      )}
                      <span className="font-medium">{t(`admin.settings.${item.id}`)}</span>
                      {item.id === 'favorites' && favorites.length > 0 && (
                        <span className="ml-auto rounded-full bg-warning-500/20 px-2 py-0.5 text-xs text-warning-400">
                          {favorites.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Scrollable Content */}
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="truncate text-xl font-semibold text-dark-100">
              {t(`admin.settings.${activeSection}`)}
            </h2>
            <div className="flex-1" />
            <SettingsSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              resultsCount={filteredSettings.length}
              allSettings={allSettings}
              onSelectSetting={handleSelectSetting}
            />
          </div>
          <SettingsSearchResults searchQuery={searchQuery} resultsCount={filteredSettings.length} />
          {renderContent()}
        </div>
      </div>
    </>
  );
}
