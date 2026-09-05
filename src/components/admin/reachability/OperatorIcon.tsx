import { cn } from '@/lib/utils';
import { operatorIconUrl } from './operatorIcons';

interface OperatorIconProps {
  operator: string | null | undefined;
  className?: string;
}

/**
 * Иконка оператора рядом с его названием. Декоративна: имя оператора всегда стоит
 * текстом рядом, поэтому картинка скрыта от скринридера. Неизвестный оператор —
 * плитка с первой буквой кода.
 */
export function OperatorIcon({ operator, className }: OperatorIconProps) {
  const url = operatorIconUrl(operator);
  const box = cn('h-5 w-5 shrink-0 rounded-md', className);
  if (url) {
    return <img src={url} alt="" role="presentation" aria-hidden="true" className={box} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        box,
        'inline-flex items-center justify-center bg-dark-700 text-[10px] font-semibold uppercase text-dark-300',
      )}
    >
      {(operator ?? '?').charAt(0).toUpperCase()}
    </span>
  );
}
