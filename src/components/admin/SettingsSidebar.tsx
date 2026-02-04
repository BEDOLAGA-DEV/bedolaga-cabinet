import { useTranslation } from 'react-i18next';
import { AdminBackButton, StarIcon, CloseIcon, MENU_SECTIONS } from './index';

interface SettingsSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  favoritesCount: number;
}

export function SettingsSidebar({
  activeSection,
  setActiveSection,
  mobileMenuOpen,
  setMobileMenuOpen,
  favoritesCount,
}: SettingsSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 h-screen w-64 flex-shrink-0 transform border-r border-dark-700/50 bg-dark-900 transition-transform duration-200 ease-in-out lg:sticky lg:top-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} `}
    >
      {/* Header */}
      <div className="border-b border-dark-700/50 p-4">
        <div className="flex items-center gap-3">
          <AdminBackButton className="rounded-xl bg-dark-800 p-2 transition-colors hover:bg-dark-700" />
          <h1 className="text-lg font-bold text-dark-100">{t('admin.settings.title')}</h1>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto rounded-xl bg-dark-800 p-2 transition-colors hover:bg-dark-700 lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Menu */}
      <nav className="max-h-[calc(100vh-80px)] space-y-1 overflow-y-auto p-2">
        {MENU_SECTIONS.map((section, sectionIdx) => (
          <div key={section.id}>
            {sectionIdx > 0 && <div className="my-3 border-t border-dark-700/50" />}
            {section.items.map((item) => {
              const isActive = activeSection === item.id;
              const hasIcon = item.iconType === 'star';
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                    isActive
                      ? 'bg-accent-500/10 text-accent-400'
                      : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200'
                  }`}
                >
                  {hasIcon && <StarIcon filled={isActive && item.id === 'favorites'} />}
                  <span className="font-medium">{t(`admin.settings.${item.id}`)}</span>
                  {item.id === 'favorites' && favoritesCount > 0 && (
                    <span className="ml-auto rounded-full bg-warning-500/20 px-2 py-0.5 text-xs text-warning-400">
                      {favoritesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
