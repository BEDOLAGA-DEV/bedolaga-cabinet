import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/primitives/Popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/primitives/Command';
import { ChevronIcon, CheckIcon } from '@/components/icons';
import type { SubscriptionMirrorSelection } from '@/hooks/useSubscriptionMirror';
export function MirrorSelector({ selection }: { selection: SubscriptionMirrorSelection }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!selection.mirrors.length) return null;
  const options = [{ id: '', label: t('subscription.mirrors.primary') }, ...selection.mirrors];
  const label = options.find((option) => option.id === (selection.selectedId ?? ''))?.label;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="btn-ghost inline-flex max-w-full items-center gap-1 px-2 py-1 text-xs text-dark-400"
          aria-label={t('subscription.mirrors.choose', { label })}
        >
          <span className="truncate">{label}</span>
          <ChevronIcon className="h-3 w-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-[calc(100vw-2rem)] p-1">
        <Command label={t('subscription.mirrors.title')}>
          {options.length > 8 && (
            <CommandInput
              placeholder={t('subscription.mirrors.search')}
              aria-label={t('subscription.mirrors.search')}
            />
          )}
          <CommandList>
            <CommandEmpty>{t('subscription.mirrors.empty')}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                tabIndex={0}
                key={option.id}
                value={option.id || 'primary'}
                keywords={[option.label]}
                onSelect={() => {
                  selection.select(option.id || null);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.id === (selection.selectedId ?? '') && <CheckIcon className="h-4 w-4" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
