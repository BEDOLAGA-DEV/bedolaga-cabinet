import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon, HistoryIcon, ScanIcon, ServerIcon, ShieldIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { type PageTab, TAB_KEYS } from './deepLink';

interface ModeSwitchProps {
  value: PageTab;
  onChange: (mode: PageTab) => void;
  /** Какие вкладки показывать; по умолчанию четыре запуска и история. */
  modes?: readonly PageTab[];
}

/** Значки вкладок, как у подвкладок оригинала bsbord.com: сервер, глобус, рамка скана, щит, часы. */
const ICONS: Record<PageTab, ComponentType<{ className?: string }>> = {
  hosts: ServerIcon,
  ip: GlobeIcon,
  cidr: ScanIcon,
  vless: ShieldIcon,
  history: HistoryIcon,
};

/**
 * Вкладки как в оригинале bsbord.com: хосты панели, IP / домен, CIDR, подписка — и «История»
 * последней, в той же полосе, где её ищут первым делом. На телефоне значок над подписью, чтобы
 * все пять умещались в строку без переносов; на десктопе значок рядом с подписью.
 */
export function ModeSwitch({ value, onChange, modes = TAB_KEYS }: ModeSwitchProps) {
  const { t } = useTranslation();
  return (
    <div
      role="tablist"
      aria-label={t('admin.reachability.switch.label')}
      className="grid gap-0.5 rounded-xl bg-dark-800/50 p-1 sm:gap-1"
      style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
    >
      {modes.map((mode) => {
        const active = mode === value;
        const Icon = ICONS[mode];
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={cn(
              'flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] font-medium leading-tight transition-all sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2 sm:text-sm',
              active
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'text-dark-400 hover:text-dark-200',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">{t(`admin.reachability.switch.${mode}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
