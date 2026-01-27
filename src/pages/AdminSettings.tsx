import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminSettingsApi, SettingDefinition } from '../api/adminSettings';
import { themeColorsApi } from '../api/themeColors';
import { useFavoriteSettings } from '../hooks/useFavoriteSettings';
import { MenuIcon, MENU_SECTIONS, MenuItem, formatSettingKey } from '../components/admin';
import { AnalyticsTab } from '../components/admin/AnalyticsTab';
import { BrandingTab } from '../components/admin/BrandingTab';
import { ThemeTab } from '../components/admin/ThemeTab';
import { FavoritesTab } from '../components/admin/FavoritesTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { SettingsSidebar } from '../components/admin/SettingsSidebar';
import {
  SettingsSearch,
  SettingsSearchMobile,
  SettingsSearchResults,
} from '../components/admin/SettingsSearch';

export default function AdminSettings() {
  const { t } = useTranslation();

  // State
  const [activeSection, setActiveSection] = useState('branding');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Favorites hook
  const { favorites, toggleFavorite, isFavorite } = useFavoriteSettings();

  // Scroll to top on mount and section change (fix for mobile webviews)
  useEffect(() => {
    // Use requestAnimationFrame for smoother scroll on mobile
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
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
    <div className="pt-safe flex min-h-screen">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <SettingsSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        favoritesCount={favorites.length}
      />

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Header */}
        <div className="sticky top-0 z-30 border-b border-dark-700/50 bg-dark-900/95 p-3 backdrop-blur-xl sm:p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl bg-dark-800 p-2 transition-colors hover:bg-dark-700 lg:hidden"
            >
              <MenuIcon />
            </button>

            <h2 className="truncate text-lg font-semibold text-dark-100 sm:text-xl">
              {t(`admin.settings.${activeSection}`)}
            </h2>

            <div className="flex-1" />

            <SettingsSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              resultsCount={filteredSettings.length}
            />
          </div>

          <SettingsSearchMobile searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

          <SettingsSearchResults searchQuery={searchQuery} resultsCount={filteredSettings.length} />
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-6">{renderContent()}</div>
      </main>
    </div>
  );
}
