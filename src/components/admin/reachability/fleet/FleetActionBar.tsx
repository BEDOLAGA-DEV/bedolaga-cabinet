import type { ReactNode } from 'react';

interface FleetActionBarProps {
  title: string;
  subtitle?: string;
  action: ReactNode;
}

/**
 * Плашка действия на телефоне и в Mini App: над нижней навигацией, как LaunchBar у одиночных
 * проверок. Слева что предлагаем и за сколько, справа одна кнопка.
 */
export function FleetActionBar({ title, subtitle, action }: FleetActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-40 px-3 lg:hidden">
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
