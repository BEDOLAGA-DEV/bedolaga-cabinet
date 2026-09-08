import type { ReactNode } from 'react';
import { HIDDEN_UNDER_KEYBOARD, useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';
import { cn } from '@/lib/utils';

interface FleetActionBarProps {
  title: string;
  subtitle?: string;
  action: ReactNode;
}

/**
 * Плашка действия на телефоне и в Mini App: у низа экрана, как LaunchBar у одиночных
 * проверок. Слева что предлагаем и за сколько, справа одна кнопка. Пока открыта экранная
 * клавиатура (фокус в поиске по серверам), прячется — иначе всплывает над клавиатурой.
 */
export function FleetActionBar({ title, subtitle, action }: FleetActionBarProps) {
  const keyboardOpen = useVirtualKeyboard();
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-40 px-3 transition-opacity duration-200 lg:hidden',
        keyboardOpen && HIDDEN_UNDER_KEYBOARD,
      )}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-dark-700 bg-dark-900 p-3 shadow-2xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-dark-100">{title}</p>
          {subtitle && <p className="truncate text-xs text-dark-400">{subtitle}</p>}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}
