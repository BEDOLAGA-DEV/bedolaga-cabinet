import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';

interface FocusAnchorProps {
  /** Якорь без «#»: блок прокрутится и мигнёт по ссылке `…#id`. */
  id: string;
  children: ReactNode;
  className?: string;
}

/** Прокрутка ждёт, пока страница дорисуется по данным. */
const SCROLL_DELAY_MS = 150;
/** Вспышка — когда плавная прокрутка уже доехала. */
const FLASH_AT_MS = 550;
/** Сколько вспышка держится, прежде чем погаснуть. */
const FLASH_HOLD_MS = 350;

/**
 * Обёртка-якорь для перехода «прямо к блоку» с другой страницы: главная ведёт
 * на `/subscriptions/7#autopay`, блок прокручивается в середину экрана и коротко
 * мигает мягкой подложкой — взгляд ловит его, а экран не кричит.
 *
 * Появление быстрое (150 мс), угасание дольше (500 мс): так вспышка читается
 * как один «блик», а не как мигание.
 */
export function FocusAnchor({ id, children, className }: FocusAnchorProps) {
  const { hash } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  const active = hash === `#${id}`;

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers = [
      window.setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }, SCROLL_DELAY_MS),
      window.setTimeout(() => setLit(true), reduced ? SCROLL_DELAY_MS : FLASH_AT_MS),
      window.setTimeout(
        () => setLit(false),
        (reduced ? SCROLL_DELAY_MS : FLASH_AT_MS) + FLASH_HOLD_MS,
      ),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active]);

  return (
    <div
      ref={ref}
      id={id}
      data-focus-lit={lit || undefined}
      className={`scroll-mt-24 rounded-2xl transition-[background-color,box-shadow] ease-out ${
        lit
          ? 'bg-accent-500/[0.07] shadow-[0_0_0_1px_rgba(var(--color-accent-500),0.35)] duration-150'
          : 'shadow-[0_0_0_1px_rgba(var(--color-accent-500),0)] duration-500'
      } ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export default FocusAnchor;
