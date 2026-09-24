import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

export interface IconTab<T extends string> {
  value: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface IconTabsProps<T extends string> {
  value: T;
  tabs: ReadonlyArray<IconTab<T>>;
  onChange: (value: T) => void;
  /** Подпись полосы вкладок для скринридера. */
  label: string;
}

/**
 * Полоса вкладок раздела со значками: на телефоне значок над подписью (подпись переносится, но
 * вкладки не налезают друг на друга), на десктопе значок рядом с подписью. Выбранная — акцентом.
 */
export function IconTabs<T extends string>({ value, tabs, onChange, label }: IconTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid gap-0.5 rounded-xl bg-dark-800/50 p-1 sm:gap-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] font-medium leading-tight transition-all sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2 sm:text-sm',
              active
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'text-dark-400 hover:text-dark-200',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" />
            <span className="text-center sm:whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
