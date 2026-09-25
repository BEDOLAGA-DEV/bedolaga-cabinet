import type { ReactNode } from 'react';

interface SectionHeadingProps {
  id?: string;
  title: string;
  hint?: string;
  /** Что стоит справа от заголовка: счётчик, кнопка. */
  aside?: ReactNode;
}

/**
 * Заголовок секции внутри страницы: без карточки. Заголовок и aside — одной строкой, подсказка
 * под ними во всю ширину, поэтому на телефоне aside не уезжает на отдельную строку из-за длинной
 * подсказки.
 */
export function SectionHeading({ id, title, hint, aside }: SectionHeadingProps) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-x-4">
        <h2 id={id} className="min-w-0 text-lg font-semibold text-dark-100">
          {title}
        </h2>
        {aside && <div className="shrink-0 text-xs text-dark-400">{aside}</div>}
      </div>
      {hint && <p className="text-xs text-dark-400">{hint}</p>}
    </div>
  );
}
