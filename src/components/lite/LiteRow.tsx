import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

const ROW_CLASS = cn(
  'flex w-full items-center justify-between gap-4 py-4 text-left',
  'text-dark-100 transition-colors hover:text-dark-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
);

interface LiteRowContentProps {
  label: string;
  /** Правая часть строки: остаток, сумма, счётчик. Необязательна. */
  value?: ReactNode;
}

function RowBody({ label, value }: LiteRowContentProps) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate text-[15px]">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {value !== undefined && (
          <span className="text-[15px] tabular-nums text-dark-400">{value}</span>
        )}
        <ChevronRightIcon className="h-4 w-4 text-dark-500" />
      </span>
    </>
  );
}

type LiteRowProps = LiteRowContentProps &
  (
    | { to: string; onClick?: never }
    // Строка, которая раскрывает панель прямо здесь, — это кнопка, а не ссылка
    // в никуда: `<a href="#">` с preventDefault читается скринридером как
    // переход и ломает переход по Tab к настоящей навигации.
    | { to?: never; onClick: () => void }
  );

/**
 * Строка списка второго плана.
 *
 * Здесь намеренно нет карточек: на телефоне десяток плиток с рамками и есть то
 * «соревнование за внимание», на которое жаловались. Список с волосяными
 * разделителями — родной язык этого места, кабинет живёт внутри Telegram, и
 * настройки там выглядят именно так. Стрелку рисуем иконкой, а не символом в
 * тексте: иконка не попадает в озвучку скринридера и не ломает перенос строки.
 */
export function LiteRow({ label, value, ...rest }: LiteRowProps) {
  if (rest.to !== undefined) {
    return (
      <Link to={rest.to} className={ROW_CLASS}>
        <RowBody label={label} value={value} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={rest.onClick} className={ROW_CLASS}>
      <RowBody label={label} value={value} />
    </button>
  );
}

/** Группа строк с разделителями между ними — и только между ними. */
export function LiteRowGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-dark-700/40">{children}</div>;
}

export default LiteRow;
