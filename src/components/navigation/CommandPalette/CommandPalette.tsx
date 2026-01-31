import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/primitives/Command';
import { usePlatform } from '@/platform';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
  backdrop,
  backdropTransition,
  commandPalette,
  commandPaletteTransition,
} from '@/components/motion/transitions';

// Icons
import {
  HomeIcon,
  SubscriptionIcon,
  WalletIcon,
  UsersIcon,
  ChatIcon,
  UserIcon,
  GamepadIcon,
  ClipboardIcon,
  InfoIcon,
  CogIcon,
  WheelIcon,
  PlusIcon,
  DownloadIcon,
  SunIcon,
  MoonIcon,
} from '@/components/layout/AppShell/icons';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wheelEnabled?: boolean;
  referralEnabled?: boolean;
  hasContests?: boolean;
  hasPolls?: boolean;
}

export function CommandPalette({
  open,
  onOpenChange,
  wheelEnabled,
  referralEnabled,
  hasContests,
  hasPolls,
}: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { haptic } = usePlatform();
  const { isAdmin } = useAuthStore();
  const { toggleTheme, isDark } = useTheme();
  const [search, setSearch] = useState('');

  const runCommand = useCallback(
    (command: () => void) => {
      haptic.impact('light');
      onOpenChange(false);
      command();
    },
    [haptic, onOpenChange],
  );

  // Navigation items
  const navigationItems = [
    { label: t('nav.dashboard'), icon: HomeIcon, path: '/' },
    { label: t('nav.subscription'), icon: SubscriptionIcon, path: '/subscription' },
    { label: t('nav.balance'), icon: WalletIcon, path: '/balance' },
    ...(referralEnabled ? [{ label: t('nav.referral'), icon: UsersIcon, path: '/referral' }] : []),
    { label: t('nav.support'), icon: ChatIcon, path: '/support' },
    ...(hasContests ? [{ label: t('nav.contests'), icon: GamepadIcon, path: '/contests' }] : []),
    ...(hasPolls ? [{ label: t('nav.polls'), icon: ClipboardIcon, path: '/polls' }] : []),
    ...(wheelEnabled ? [{ label: t('nav.wheel'), icon: WheelIcon, path: '/wheel' }] : []),
    { label: t('nav.info'), icon: InfoIcon, path: '/info' },
    { label: t('nav.profile'), icon: UserIcon, path: '/profile' },
    ...(isAdmin ? [{ label: t('admin.nav.title'), icon: CogIcon, path: '/admin' }] : []),
  ];

  // Action items
  const actionItems = [
    {
      label: t('balance.top_up') || 'Top up balance',
      icon: PlusIcon,
      action: () => navigate('/balance'),
    },
    {
      label: t('subscription.get_config') || 'Get VPN config',
      icon: DownloadIcon,
      action: () => navigate('/subscription'),
    },
    {
      label: isDark ? t('theme.light') || 'Light mode' : t('theme.dark') || 'Dark mode',
      icon: isDark ? SunIcon : MoonIcon,
      action: toggleTheme,
    },
    {
      label: t('support.create_ticket') || 'Create support ticket',
      icon: ChatIcon,
      action: () => navigate('/support'),
    },
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence mode="wait">
          {open && (
            <>
              {/* Backdrop */}
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                  variants={backdrop}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={backdropTransition}
                />
              </DialogPrimitive.Overlay>

              {/* Content */}
              <DialogPrimitive.Content asChild>
                <motion.div
                  className={cn(
                    'fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2',
                    'overflow-hidden rounded-linear-lg border border-dark-700/50 bg-dark-900/95 backdrop-blur-linear',
                    'shadow-2xl',
                    'focus:outline-none',
                  )}
                  variants={commandPalette}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={commandPaletteTransition}
                >
                  <Command>
                    <CommandInput
                      placeholder={t('common.search') || 'Search...'}
                      value={search}
                      onValueChange={setSearch}
                    />
                    <CommandList>
                      <CommandEmpty>{t('common.no_results') || 'No results found.'}</CommandEmpty>

                      {/* Navigation */}
                      <CommandGroup heading={t('nav.navigation') || 'Navigation'}>
                        {navigationItems.map((item) => (
                          <CommandItem
                            key={item.path}
                            value={item.label}
                            onSelect={() => runCommand(() => navigate(item.path))}
                          >
                            <item.icon className="mr-2 h-4 w-4 text-dark-400" />
                            <span>{item.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      {/* Actions */}
                      <CommandGroup heading={t('common.actions') || 'Actions'}>
                        {actionItems.map((item) => (
                          <CommandItem
                            key={item.label}
                            value={item.label}
                            onSelect={() => runCommand(item.action)}
                          >
                            <item.icon className="mr-2 h-4 w-4 text-dark-400" />
                            <span>{item.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>

                    {/* Footer with keyboard hints */}
                    <div className="flex items-center justify-between border-t border-dark-700/50 px-3 py-2 text-xs text-dark-500">
                      <div className="flex items-center gap-2">
                        <kbd className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-dark-400">
                          ↑↓
                        </kbd>
                        <span>navigate</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-dark-400">
                          ↵
                        </kbd>
                        <span>select</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-dark-400">
                          esc
                        </kbd>
                        <span>close</span>
                      </div>
                    </div>
                  </Command>
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
