import { type ReactNode, type Ref } from 'react';
import { motion } from 'framer-motion';
import { scale, scaleTransition, slideUp, slideUpTransition } from '../motion/transitions';
import { cn } from '@/lib/utils';

export type BlockingAccent = 'warning' | 'error' | 'info';

/**
 * Per-accent class recipe. `info` maps to the theme accent-* scale (default
 * blue). Colors are theme-driven CSS vars (RGB triples), never hardcoded hex.
 */
const accentMap: Record<
  BlockingAccent,
  {
    glow: string;
    medallion: string;
    sheen: string;
    iconColor: string;
    dot: string;
    hairline: string;
  }
> = {
  warning: {
    glow: 'bg-warning-500/10',
    medallion:
      'bg-warning-500/10 ring-warning-500/30 shadow-[0_0_44px_-8px_rgba(var(--color-warning-500),0.5)]',
    sheen: 'from-warning-500/25',
    iconColor: 'text-warning-400',
    dot: 'bg-warning-500',
    hairline: 'via-warning-500/40',
  },
  error: {
    glow: 'bg-error-500/10',
    medallion:
      'bg-error-500/10 ring-error-500/30 shadow-[0_0_44px_-8px_rgba(var(--color-error-500),0.5)]',
    sheen: 'from-error-500/25',
    iconColor: 'text-error-400',
    dot: 'bg-error-500',
    hairline: 'via-error-500/40',
  },
  info: {
    glow: 'bg-accent-500/10',
    medallion: 'bg-accent-500/10 ring-accent-500/30 shadow-glow-lg',
    sheen: 'from-accent-500/25',
    iconColor: 'text-accent-400',
    dot: 'bg-accent-500',
    hairline: 'via-accent-500/40',
  },
};

interface BlockingShellProps {
  /** Unique id wired to aria-labelledby (e.g. 'maintenance-title'). */
  titleId: string;
  accent: BlockingAccent;
  /** Rendered icon element (sized by the caller, e.g. <WrenchIcon className="h-9 w-9" />). */
  icon: ReactNode;
  /** Already-translated title. */
  title: string;
  description?: ReactNode;
  /** Per-screen body: reason cards, channel list, error block. */
  children?: ReactNode;
  /** CTA area — pass canonical <Button> elements. */
  actions?: ReactNode;
  /** Hint / contact-support line under the card. */
  footer?: ReactNode;
  /** Accent-tinted "working" dots, for screens that actively wait/poll. */
  pulse?: boolean;
  /** 'polite' for screens whose state changes (retry/error) should announce. */
  ariaLive?: 'polite' | 'off';
  /** Focus-trap ref — owned by the caller so each screen keeps its own trap. */
  screenRef: Ref<HTMLDivElement>;
}

/**
 * Shared premium shell for every full-screen blocking/status state: an opaque
 * dark canvas with a self-contained accent glow, a centered glass card, and a
 * gradient-ringed icon medallion. Replaces the old flat grey-circle + three
 * raw dots look. Behavior (focus trap, aria, actions) is supplied by each
 * screen; this component owns only the visual chrome.
 */
export default function BlockingShell({
  titleId,
  accent,
  icon,
  title,
  description,
  children,
  actions,
  footer,
  pulse = false,
  ariaLive = 'off',
  screenRef,
}: BlockingShellProps) {
  const a = accentMap[accent];

  return (
    <div
      ref={screenRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-[100] overflow-y-auto bg-dark-950"
    >
      {/* Self-contained backdrop — accent glow behind the card. No app reveal:
          the canvas stays opaque so this remains a hard block. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={cn(
            'absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-[58%] rounded-full blur-[130px]',
            a.glow,
          )}
        />
        <div className="absolute -bottom-24 left-1/2 h-72 w-[22rem] -translate-x-1/2 rounded-full bg-dark-800/30 blur-[120px]" />
      </div>

      {/* Scroll-safe centering: min-h-full + items-center centers when it fits
          and scrolls without clipping the top when content is tall. */}
      <div className="relative flex min-h-full items-center justify-center p-6">
        <motion.div
          variants={scale}
          initial="initial"
          animate="animate"
          transition={scaleTransition}
          aria-live={ariaLive === 'polite' ? 'polite' : undefined}
          aria-atomic={ariaLive === 'polite' ? true : undefined}
          className="relative w-full max-w-md overflow-hidden rounded-[var(--bento-radius)] border border-dark-700/40 bg-dark-900/80 p-8 text-center shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:p-10"
        >
          {/* Top accent hairline */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
              a.hairline,
            )}
          />

          {/* Icon medallion — gradient ring + glow, not a flat grey circle */}
          <motion.div
            variants={slideUp}
            initial="initial"
            animate="animate"
            transition={slideUpTransition}
            className="mb-6 flex justify-center"
          >
            <span
              className={cn(
                'relative flex h-20 w-20 items-center justify-center rounded-full ring-1',
                a.medallion,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-full bg-gradient-to-br to-transparent',
                  a.sheen,
                )}
              />
              <span className={cn('relative', a.iconColor)}>{icon}</span>
            </span>
          </motion.div>

          <h1 id={titleId} className="font-display text-2xl font-bold tracking-tight text-dark-50">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-base leading-relaxed text-dark-400">{description}</p>
          )}

          {children && <div className="mt-6 space-y-3 text-left">{children}</div>}

          {actions && <div className="mt-7 flex flex-col gap-3">{actions}</div>}

          {pulse && (
            <div aria-hidden className="mt-7 flex items-center justify-center gap-1.5">
              <span
                className={cn('h-1.5 w-1.5 animate-pulse rounded-full', a.dot)}
                style={{ animationDelay: '0ms' }}
              />
              <span
                className={cn('h-1.5 w-1.5 animate-pulse rounded-full', a.dot)}
                style={{ animationDelay: '300ms' }}
              />
              <span
                className={cn('h-1.5 w-1.5 animate-pulse rounded-full', a.dot)}
                style={{ animationDelay: '600ms' }}
              />
            </div>
          )}

          {footer && <p className="mt-6 text-sm text-dark-500">{footer}</p>}
        </motion.div>
      </div>
    </div>
  );
}
