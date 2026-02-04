import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import { MENU_SECTIONS } from './constants';
import { StarIcon } from './icons';

interface SettingsMobileTabsProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  favoritesCount: number;
}

export function SettingsMobileTabs({
  activeSection,
  setActiveSection,
  favoritesCount,
}: SettingsMobileTabsProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeEl = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      // Check if active element is not fully visible
      if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSection]);

  // Flatten all items from all sections
  const allItems = MENU_SECTIONS.flatMap((section) => section.items);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-hide flex gap-2 overflow-x-auto px-3 py-3"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {allItems.map((item) => {
        const isActive = activeSection === item.id;
        const hasIcon = item.iconType === 'star';

        return (
          <button
            key={item.id}
            ref={isActive ? activeRef : null}
            onClick={() => setActiveSection(item.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 active:bg-dark-700'
            }`}
          >
            {hasIcon && <StarIcon filled={isActive && item.id === 'favorites'} />}
            <span className="whitespace-nowrap">{t(`admin.settings.${item.id}`)}</span>
            {item.id === 'favorites' && favoritesCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isActive
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-warning-500/20 text-warning-400'
                }`}
              >
                {favoritesCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
