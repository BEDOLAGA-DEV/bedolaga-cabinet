import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { HIDDEN_UNDER_KEYBOARD, useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';

import { HomeIcon, SubscriptionIcon, WalletIcon, UsersIcon, ChatIcon, WheelIcon } from './icons';
import type { MobileNavItem, MobileNavKey } from './mobileNavRoutes';

type NavIcon = React.ComponentType<{ className?: string }>;

const ICONS: Record<MobileNavKey, NavIcon> = {
  dashboard: HomeIcon,
  subscription: SubscriptionIcon,
  balance: WalletIcon,
  wheel: WheelIcon,
  referral: UsersIcon,
  support: ChatIcon,
};

interface MobileBottomNavProps {
  /** Экраны панели — из mobileNavItems(); AppShell рендерит панель только на них. */
  items: readonly MobileNavItem[];
  /** Открыто выезжающее меню шапки: у него есть все те же пункты, панель поверх него лишняя. */
  isMenuOpen?: boolean;
}

export function MobileBottomNav({ items, isMenuOpen = false }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { haptic } = usePlatform();
  const isKeyboardOpen = useVirtualKeyboard();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleNavClick = () => {
    haptic.impact('light');
  };

  return (
    <nav
      className={cn(
        'fixed z-50 transition-all duration-200 lg:hidden',
        'bg-dark-900/95 backdrop-blur-linear',
        'border border-dark-700/30',
        isKeyboardOpen || isMenuOpen ? HIDDEN_UNDER_KEYBOARD : 'opacity-100',
      )}
      style={{
        // Отступ снизу и просвет под панелью объявлены в globals.css
        // (--mobile-nav-*): в standalone iOS inset около 34pt, и панель стоит
        // вплотную к безопасной зоне, в браузере — 16px.
        bottom: 'var(--mobile-nav-offset)',
        // По бокам та же логика: в альбомной ориентации iPhone вырезы слева и
        // справа около 59pt, панель не должна уходить под чёлку и углы.
        left: 'max(16px, env(safe-area-inset-left, 0px))',
        right: 'max(16px, env(safe-area-inset-right, 0px))',
        borderRadius: 'var(--bento-radius, 24px)',
        padding: '8px 4px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
      }}
    >
      <div className="flex justify-around">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                'relative flex min-w-[56px] flex-1 shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2.5 transition-all duration-200',
                isActive(item.path) ? 'text-accent-400' : 'text-dark-400 hover:text-dark-200',
              )}
            >
              {isActive(item.path) && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-2xl bg-accent-500/15"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5" />
              <span className="relative z-10 mt-1 whitespace-nowrap text-2xs">
                {t(`nav.${item.key}`)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
