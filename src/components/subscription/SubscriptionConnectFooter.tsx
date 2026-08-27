import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, DevicesIcon, WarningIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { ConnectFooterState } from './connectFooterState';

interface SubscriptionConnectFooterProps {
  state: ConnectFooterState;
  /** Цвет разделителя берём у карточки, чтобы подвал читался её частью. */
  borderColor: string;
  mutedColor: string;
  onConnect: () => void;
  onManage: () => void;
}

/**
 * Подвал карточки подписки: подключить устройство либо разобраться с лимитом.
 *
 * Отдельная зона нажатия внутри карточки, поэтому карточка снаружи — не
 * `<button>`, а обёртка: вложенные кнопки невалидны и ломаются в браузере.
 */
export function SubscriptionConnectFooter({
  state,
  borderColor,
  mutedColor,
  onConnect,
  onManage,
}: SubscriptionConnectFooterProps) {
  const { t } = useTranslation();

  if (state.kind === 'hidden') return null;

  if (state.kind === 'loading') {
    return (
      <div
        className="flex items-center gap-2.5 border-t px-4 py-2.5"
        style={{ borderColor }}
        role="status"
        aria-busy="true"
        aria-label={t('common.loading')}
      >
        {/* Высоту задаёт невидимый текст с той же типографикой, что у готового
            подвала. Подбирать её числом нельзя: строчный бокс даёт дробные
            пиксели, и карточка дёргается при появлении данных. */}
        <div className="flex w-full items-center gap-2.5">
          <Skeleton className="h-4 w-4 shrink-0" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="ml-auto h-3 w-10" />
          <span aria-hidden className="w-0 overflow-hidden text-[13px] font-medium">
            &nbsp;
          </span>
        </div>
      </div>
    );
  }

  const isFull = state.kind === 'full';
  const highlight = state.kind === 'connect' && state.highlight;

  const counter =
    state.kind === 'connect' && state.unlimited
      ? `${state.used} · ∞`
      : `${state.used} / ${state.limit}`;

  return (
    <button
      type="button"
      onClick={isFull ? onManage : onConnect}
      className="flex w-full items-center gap-2.5 border-t px-4 py-2.5 text-left transition-colors active:bg-accent-500/10"
      style={{ borderColor }}
    >
      {isFull ? (
        <WarningIcon className="h-4 w-4 shrink-0 text-warning-400/80" />
      ) : (
        <DevicesIcon
          className={cn('h-4 w-4 shrink-0', highlight ? 'text-accent-400' : 'opacity-40')}
        />
      )}
      <span
        className={cn('text-[13px] font-medium', highlight && 'text-accent-400')}
        style={highlight ? undefined : { color: mutedColor }}
      >
        {isFull
          ? t('subscription.connectFooter.full', 'Все слоты заняты')
          : t('subscription.connectFooter.connect', 'Подключить устройство')}
      </span>
      <span
        className={cn('ml-auto text-[11px] tabular-nums', isFull && 'text-warning-400/80')}
        style={isFull ? undefined : { color: mutedColor }}
      >
        {counter}
      </span>
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 opacity-30" />
    </button>
  );
}
