import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from './DropdownSelect';
import { isSubscriptionLevelAction } from './actionTargets';
import type { BulkActionType } from '../../../api/adminBulkActions';

// ──────────────────────────────────────────────────────────────────
// FloatingActionBar
//
// Bottom-dock selection toolbar for AdminBulkActions. Shows selected
// user/subscription counts, the "select-all subscriptions" toggle
// (multi-tariff only), and the action dropdown grouped into
// subscription-level vs user-level when multi-tariff is on.
//
// Pure presentational — parent owns selection state, supplies onAction
// (opens the modal with the picked action type) and onToggleAll.
// ──────────────────────────────────────────────────────────────────

interface ActionConfig {
  type: BulkActionType;
  labelKey: string;
  icon: ReactNode;
  colorClass: string;
}

export interface FloatingActionBarProps {
  selectedUserCount: number;
  selectedSubscriptionCount: number;
  isMultiTariff: boolean;
  totalVisibleSubscriptionCount: number;
  onAction: (type: BulkActionType) => void;
  onToggleAllSubscriptions: () => void;
}

export function FloatingActionBar({
  selectedUserCount,
  selectedSubscriptionCount,
  isMultiTariff,
  totalVisibleSubscriptionCount,
  onAction,
  onToggleAllSubscriptions,
}: FloatingActionBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasAnySelection = selectedUserCount > 0 || selectedSubscriptionCount > 0;
  if (!hasAnySelection) return null;

  const actions: ActionConfig[] = [
    {
      type: 'extend_subscription',
      labelKey: 'admin.bulkActions.actions.extend',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-success-400 hover:bg-success-500/10',
    },
    {
      type: 'activate_subscription',
      labelKey: 'admin.bulkActions.actions.activate',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-success-400 hover:bg-success-500/10',
    },
    {
      type: 'cancel_subscription',
      labelKey: 'admin.bulkActions.actions.cancel',
      icon: <span aria-hidden="true">-</span>,
      colorClass: 'text-error-400 hover:bg-error-500/10',
    },
    {
      type: 'change_tariff',
      labelKey: 'admin.bulkActions.actions.changeTariff',
      icon: <span aria-hidden="true">~</span>,
      colorClass: 'text-accent-400 hover:bg-accent-500/10',
    },
    {
      type: 'add_traffic',
      labelKey: 'admin.bulkActions.actions.addTraffic',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-accent-400 hover:bg-accent-500/10',
    },
    {
      type: 'set_devices',
      labelKey: 'admin.bulkActions.actions.setDevices',
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
          />
        </svg>
      ),
      colorClass: 'text-accent-400 hover:bg-accent-500/10',
    },
    {
      type: 'delete_subscription',
      labelKey: 'admin.bulkActions.actions.deleteSubscription',
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      ),
      colorClass: 'text-error-400 hover:bg-error-500/10',
    },
    {
      type: 'add_balance',
      labelKey: 'admin.bulkActions.actions.addBalance',
      icon: <span aria-hidden="true">$</span>,
      colorClass: 'text-warning-400 hover:bg-warning-500/10',
    },
    {
      type: 'grant_subscription',
      labelKey: 'admin.bulkActions.actions.grantSubscription',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-success-400 hover:bg-success-500/10',
    },
    {
      type: 'assign_promo_group',
      labelKey: 'admin.bulkActions.actions.assignPromoGroup',
      icon: <span aria-hidden="true">%</span>,
      colorClass: 'text-accent-300 hover:bg-accent-300/10',
    },
    {
      type: 'delete_user',
      labelKey: 'admin.bulkActions.actions.deleteUser',
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M22 10.5h-6m-8.25-4.5a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM1.5 21a8.25 8.25 0 0115 0"
          />
        </svg>
      ),
      colorClass: 'text-error-400 hover:bg-error-500/10',
    },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-4 pb-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))]">
      <div
        ref={menuRef}
        className="relative flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-dark-700/60 bg-dark-800/80 px-5 py-3 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-2">
          {selectedUserCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20 text-sm font-bold text-accent-400">
                {selectedUserCount}
              </div>
              <span className="hidden text-xs font-medium text-dark-300 sm:inline">
                {t('admin.bulkActions.usersSelected', { count: selectedUserCount })}
              </span>
            </div>
          )}
          {isMultiTariff && selectedSubscriptionCount > 0 && (
            <div className="flex items-center gap-1.5">
              {selectedUserCount > 0 && <div className="mx-1 h-4 w-px bg-dark-700" />}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/20 text-sm font-bold text-success-400">
                {selectedSubscriptionCount}
              </div>
              <span className="hidden text-xs font-medium text-dark-300 sm:inline">
                {t('admin.bulkActions.subscriptionsSelected', {
                  count: selectedSubscriptionCount,
                })}
              </span>
            </div>
          )}
        </div>

        {isMultiTariff && totalVisibleSubscriptionCount > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-dark-700" />
            <button
              onClick={onToggleAllSubscriptions}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-dark-300 transition-colors hover:bg-dark-700 hover:text-dark-200"
            >
              {selectedSubscriptionCount === totalVisibleSubscriptionCount &&
              selectedSubscriptionCount > 0
                ? t('admin.bulkActions.deselectAllSubs')
                : t('admin.bulkActions.selectAllSubs')}
            </button>
          </>
        )}

        <div className="mx-2 h-6 w-px bg-dark-700" />

        <div className="relative ml-auto">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            {t('common.actions')}
            <ChevronDownIcon />
          </button>

          {open && (
            <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden rounded-xl border border-dark-700 bg-dark-800 py-1.5 shadow-2xl">
              {isMultiTariff && (
                <div className="border-b border-dark-700/50 px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
                    {t('admin.bulkActions.subscriptionTarget')}
                  </span>
                </div>
              )}
              {actions
                .filter((a) => isSubscriptionLevelAction(a.type))
                .map((a) => {
                  const count = isMultiTariff ? selectedSubscriptionCount : selectedUserCount;
                  const disabled = count === 0;
                  return (
                    <button
                      key={a.type}
                      onClick={() => {
                        if (disabled) return;
                        setOpen(false);
                        onAction(a.type);
                      }}
                      disabled={disabled}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
                        disabled ? 'cursor-not-allowed opacity-40' : a.colorClass,
                      )}
                    >
                      <span className="border-current/20 bg-current/5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold">
                        {a.icon}
                      </span>
                      {t(a.labelKey)}
                    </button>
                  );
                })}

              {isMultiTariff && (
                <div className="border-b border-t border-dark-700/50 px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
                    {t('admin.bulkActions.userTarget')}
                  </span>
                </div>
              )}
              {actions
                .filter((a) => !isSubscriptionLevelAction(a.type))
                .map((a) => {
                  const disabled = selectedUserCount === 0;
                  return (
                    <button
                      key={a.type}
                      onClick={() => {
                        if (disabled) return;
                        setOpen(false);
                        onAction(a.type);
                      }}
                      disabled={disabled}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
                        disabled ? 'cursor-not-allowed opacity-40' : a.colorClass,
                      )}
                    >
                      <span className="border-current/20 bg-current/5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold">
                        {a.icon}
                      </span>
                      {t(a.labelKey)}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
