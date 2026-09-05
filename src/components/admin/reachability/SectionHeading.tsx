import type { ReactNode } from 'react';

interface SectionHeadingProps {
  id?: string;
  title: string;
  hint?: string;
  /** Что стоит справа от заголовка: счётчик, кнопка. */
  aside?: ReactNode;
}

/** Заголовок секции внутри страницы: без карточки, с подсказкой и местом под счётчик. */
export function SectionHeading({ id, title, hint, aside }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold text-dark-100">
          {title}
        </h2>
        {hint && <p className="text-xs text-dark-400">{hint}</p>}
      </div>
      {aside && <div className="shrink-0 text-xs text-dark-400">{aside}</div>}
    </div>
  );
}
