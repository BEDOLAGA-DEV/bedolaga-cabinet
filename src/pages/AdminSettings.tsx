import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminSettingsApi, SettingDefinition } from '../api/adminSettings';
import { themeColorsApi } from '../api/themeColors';
import { useFavoriteSettings } from '../hooks/useFavoriteSettings';
import { SETTINGS_TREE, findTreeLocation, formatSettingKey } from '../components/admin';
import { usePlatform } from '../platform/hooks/usePlatform';
import { AnalyticsTab } from '../components/admin/AnalyticsTab';
import { BrandingTab } from '../components/admin/BrandingTab';
import { MenuEditorTab } from '../components/admin/MenuEditorTab';
import { ThemeTab } from '../components/admin/ThemeTab';
import { FavoritesTab } from '../components/admin/FavoritesTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { SettingsTreeSidebar } from '../components/admin/SettingsTreeSidebar';
import { SettingsMobileTabs } from '../components/admin/SettingsMobileTabs';
import { SettingsSearchMobile, SettingsSearchResults } from '../components/admin/SettingsSearch';

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

// ChevronRight for breadcrumbs
const ChevronRightIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-dark-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default function AdminSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

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

  // Find active tree info (group + child for tree sub-items)
  // No useMemo needed — SETTINGS_TREE is a static constant, iteration is trivial
  let activeTreeInfo: {
    group: (typeof SETTINGS_TREE.groups)[number];
    child: (typeof SETTINGS_TREE.groups)[number]['children'][number];
  } | null = null;
  for (const group of SETTINGS_TREE.groups) {
    const child = group.children.find((c) => c.id === activeSection);
    if (child) {
      activeTreeInfo = { group, child };
      break;
    }
  }

  // Settings that require SALES_MODE=tariffs to be visible
  const TARIFF_MODE_SETTINGS = ['MULTI_TARIFF_ENABLED', 'MAX_ACTIVE_SUBSCRIPTIONS'];

  // Check if tariffs mode is active
  const isTariffsMode = useMemo(() => {
    if (!allSettings || !Array.isArray(allSettings)) return false;
    const salesMode = allSettings.find((s: SettingDefinition) => s.key === 'SALES_MODE');
    return salesMode?.current === 'tariffs';
  }, [allSettings]);

  // Get categories for current sub-item
  const currentCategories = useMemo(() => {
    if (!activeTreeInfo || !allSettings || !Array.isArray(allSettings)) return [];

    const categoryKeys = activeTreeInfo.child.categories;
    const categoryMap = new Map<string, SettingDefinition[]>();

    for (const setting of allSettings) {
      if (categoryKeys.includes(setting.category.key)) {
        // Hide tariff-dependent settings when not in tariffs mode
        if (!isTariffsMode && TARIFF_MODE_SETTINGS.includes(setting.key)) continue;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeTreeInfo derived from activeSection
  }, [activeSection, allSettings, isTariffsMode, t]);

  // Filter settings for search - GLOBAL search across all settings
  const filteredSettings = useMemo(() => {
    if (!allSettings || !Array.isArray(allSettings) || !searchQuery) return [];

    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    return allSettings.filter((s: SettingDefinition) => {
      // Hide tariff-dependent settings when not in tariffs mode
      if (!isTariffsMode && TARIFF_MODE_SETTINGS.includes(s.key)) return false;

      if (s.key.toLowerCase().includes(q)) return true;
      if (s.name?.toLowerCase().includes(q)) return true;
      const formattedKey = formatSettingKey(s.name || s.key);
      const translatedName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
      if (translatedName.toLowerCase().includes(q)) return true;
      if (s.hint?.description?.toLowerCase().includes(q)) return true;
      const categoryLabel = t(`admin.settings.categories.${s.category.key}`, s.category.key);
      if (categoryLabel.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [allSettings, searchQuery, isTariffsMode, t]);

  // Favorite settings
  const favoriteSettings = useMemo(() => {
    if (!allSettings || !Array.isArray(allSettings)) return [];
    return allSettings.filter((s: SettingDefinition) => favorites.includes(s.key));
  }, [allSettings, favorites]);

  // Count of modified settings
  const modifiedCount = useMemo(() => {
    if (!allSettings || !Array.isArray(allSettings)) return 0;
    return allSettings.filter((s: SettingDefinition) => s.has_override).length;
  }, [allSettings]);

  // Total settings count
  const totalCount = useMemo(() => {
    if (!allSettings || !Array.isArray(allSettings)) return 0;
    return allSettings.length;
  }, [allSettings]);

  // Handle setting selection from autocomplete
  const handleSelectSetting = useCallback(
    (setting: SettingDefinition) => {
      const location = findTreeLocation(setting.category.key);
      if (location) {
        setActiveSection(location.subItemId);
      }
      setSearchQuery(setting.key);
    },
    [setActiveSection, setSearchQuery],
  );

  // Get the display title for the current section
  const sectionTitle = useMemo(() => {
    // Special items
    const specialItem = SETTINGS_TREE.specialItems.find((item) => item.id === activeSection);
    if (specialItem) return t(`admin.settings.${specialItem.id}`);

    // Tree sub-items
    if (activeTreeInfo) return t(`admin.settings.tree.${activeTreeInfo.child.id}`);

    return t('admin.settings.title');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeTreeInfo derived from activeSection
  }, [activeSection, t]);

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
      case 'buttons':
        return <MenuEditorTab />;
      case 'favorites':
        return (
          <FavoritesTab
            settings={favoriteSettings}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
          />
        );
      default:
        if (activeTreeInfo) {
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
        // Unknown section — fallback to branding
        setActiveSection('branding');
        return null;
    }
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="space-y-4 pb-4 lg:hidden">
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
        <div className="w-[264px] shrink-0 overflow-y-auto border-r border-dark-700/50">
          <div className="border-b border-dark-700/50 p-4">
            <div className="flex items-center gap-3">
              {/* Show back button only on web, not in Telegram Mini App */}
              {!capabilities.hasBackButton && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
                  aria-label={t('admin.settings.backToAdmin')}
                >
                  <BackIcon />
                </button>
              )}
              <h1 className="text-lg font-bold text-dark-100">{t('admin.settings.title')}</h1>
            </div>
          </div>
          <SettingsTreeSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            favoritesCount={favorites.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            allSettings={allSettings}
            onSelectSetting={handleSelectSetting}
          />
        </div>

        {/* Scrollable Content */}
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          {/* Breadcrumb for tree sub-items */}
          {activeTreeInfo && !searchQuery.trim() && (
            <div className="mb-2 flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setActiveSection(activeTreeInfo.group.children[0].id)}
                className="text-dark-500 transition-colors hover:text-dark-300"
              >
                {t(`admin.settings.groups.${activeTreeInfo.group.id}`)}
              </button>
              <ChevronRightIcon />
              <span className="text-dark-300">
                {t(`admin.settings.tree.${activeTreeInfo.child.id}`)}
              </span>
            </div>
          )}

          {/* Title + count badges */}
          <div className="mb-4 flex items-center gap-3">
            <h2 className="truncate text-xl font-semibold text-dark-100">{sectionTitle}</h2>
            {totalCount > 0 && !searchQuery.trim() && activeTreeInfo && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-dark-700/50 px-2 py-0.5 text-xs text-dark-400">
                  {t('admin.settings.totalCount', { count: totalCount })}
                </span>
                {modifiedCount > 0 && (
                  <span className="rounded-full bg-warning-500/20 px-2 py-0.5 text-xs text-warning-400">
                    {t('admin.settings.modifiedCount', { count: modifiedCount })}
                  </span>
                )}
              </div>
            )}
          </div>

          <SettingsSearchResults searchQuery={searchQuery} resultsCount={filteredSettings.length} />
          {renderContent()}
        </div>
      </div>
    </>
  );
}
