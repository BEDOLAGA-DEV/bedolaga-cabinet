import type { ReactNode } from 'react';
import { Card } from '@/components/data-display';
import { cn } from '@/lib/utils';

interface SectionProps {
  icon?: ReactNode;
  title: ReactNode;
  /** Справа в строке заголовка: ссылка «Все детали →», чип статуса, переключатель периода. */
  action?: ReactNode;
  className?: string;
  id?: string;
  children: ReactNode;
}

/** Секция вкладки: Card канона, H2 с иконкой из барреля, действие справа. */
export function Section({ icon, title, action, className, id, children }: SectionProps) {
  return (
    <Card size="md" id={id} className={cn('flex scroll-mt-24 flex-col gap-3', className)}>
      <div className="flex min-h-7 items-center gap-2.5">
        {icon && <span className="shrink-0 text-accent-400">{icon}</span>}
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold leading-tight text-dark-100">
          {title}
        </h2>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

/** Ссылка-действие внутри секции: «Изменить», «Все детали →». */
export function LinkAction({
  onClick,
  children,
  short,
  arrow = false,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  /** Короткая подпись для телефона: «Все →» вместо «Вся активность →», чтобы не резать заголовок. */
  short?: ReactNode;
  arrow?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 whitespace-nowrap text-xs font-semibold text-accent-400 transition-colors hover:text-accent-300 disabled:opacity-50"
    >
      {short ? (
        <>
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{children}</span>
        </>
      ) : (
        children
      )}
      {arrow && ' →'}
    </button>
  );
}

export interface KeyValueRow {
  key: string;
  label: string;
  value: ReactNode;
}

/** Справочные поля парами «ключ — значение», а не плитками. */
export function KeyValues({ rows, className }: { rows: KeyValueRow[]; className?: string }) {
  return (
    <dl
      className={cn(
        'm-0 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm',
        className,
      )}
    >
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <dt className="text-dark-500">{row.label}</dt>
          <dd className="m-0 min-w-0 break-words text-dark-100">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
