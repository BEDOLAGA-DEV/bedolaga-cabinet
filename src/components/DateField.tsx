import * as Popover from '@radix-ui/react-popover';
import { enUS, faIR, ru, zhCN } from 'date-fns/locale';
import { useState } from 'react';
import { DayPicker, type Matcher } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

import 'react-day-picker/style.css';

interface DateFieldProps {
  /** Selected date as 'YYYY-MM-DD', or '' when empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Inclusive bounds as 'YYYY-MM-DD'. */
  min?: string;
  max?: string;
  /** Override the trigger button classes. */
  className?: string;
}

const LOCALES = { ru, en: enUS, zh: zhCN, fa: faIR } as const;

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

function NavChevron({ orientation }: { orientation?: 'left' | 'right' | 'up' | 'down' }) {
  return orientation === 'right' ? (
    <ChevronRightIcon className="h-4 w-4" />
  ) : (
    <ChevronLeftIcon className="h-4 w-4" />
  );
}

/**
 * Dark-themed date field — Radix Popover trigger + react-day-picker calendar.
 * Drop-in replacement for `<input type="date">`: takes/returns 'YYYY-MM-DD'.
 * Month/weekday names follow the UI language (date-fns locale), navigation uses
 * the shared barrel chevrons, theming via the .rdp-dark variable overrides.
 */
export function DateField({ value, onChange, placeholder, min, max, className }: DateFieldProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const selected = parseISO(value);
  const locale = LOCALES[i18n.language as keyof typeof LOCALES] ?? enUS;
  // Numeric format keeps a constant button width across dates and locales
  // (a "short" month name varies in length and makes the trigger jitter).
  const display = selected
    ? selected.toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const disabled: Matcher[] = [];
  const minDate = parseISO(min ?? '');
  const maxDate = parseISO(max ?? '');
  if (minDate) disabled.push({ before: minDate });
  if (maxDate) disabled.push({ after: maxDate });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={
            className ??
            'flex min-w-[8rem] items-center justify-start gap-2 whitespace-nowrap rounded-lg border border-dark-600 bg-dark-800 px-3 py-1.5 text-sm text-dark-200 transition-colors hover:border-dark-500'
          }
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-dark-500" />
          <span className={`truncate ${selected ? '' : 'text-dark-500'}`}>
            {display || placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="rdp-dark z-50 max-w-[calc(100vw-1rem)] rounded-xl border border-dark-700 bg-dark-800 p-2 shadow-xl"
        >
          <DayPicker
            mode="single"
            locale={locale}
            selected={selected}
            defaultMonth={selected}
            disabled={disabled}
            fixedWeeks
            showOutsideDays
            components={{ Chevron: NavChevron }}
            onSelect={(d) => {
              if (d) {
                onChange(toISO(d));
                setOpen(false);
              }
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
