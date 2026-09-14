import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { UserDetailResponse } from '@/api/adminUsers';
import { MoreIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useDestructiveConfirm, useNativeDialog } from '@/platform/hooks/useNativeDialog';

interface UserActionsMenuProps {
  user: UserDetailResponse;
  disabled: boolean;
  /** Ссылка на проверку конфигов через операторов РФ; null — раздел недоступен. */
  reachabilityLink: string | null;
  can: { block: boolean; subscription: boolean; delete: boolean };
  onBlock: () => Promise<void>;
  onUnblock: () => Promise<void>;
  onResetTrial: () => Promise<void>;
  onResetSubscription: () => Promise<void>;
  onDisable: () => Promise<void>;
  onDelete: () => Promise<void>;
}

interface Item {
  key: string;
  label: string;
  danger?: boolean;
  run: () => Promise<void>;
}

/**
 * Редкие и опасные действия — за «⋯», а не в ряду с «Написать».
 * Опасное подтверждается системным диалогом кабинета (в Mini App — родным попапом).
 */
export function UserActionsMenu({
  user,
  disabled,
  reachabilityLink,
  can,
  onBlock,
  onUnblock,
  onResetTrial,
  onResetSubscription,
  onDisable,
  onDelete,
}: UserActionsMenuProps) {
  const { t } = useTranslation();
  const dialog = useNativeDialog();
  const confirmDestructive = useDestructiveConfirm();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const confirmed = async (messageKey: string, actionKey: string, titleKey: string) =>
    confirmDestructive(t(messageKey), t(actionKey), t(titleKey));

  const dangerous: Item[] = [];
  if (can.block) {
    dangerous.push(
      user.status === 'blocked'
        ? { key: 'unblock', label: t('admin.users.actions.unblock'), run: onUnblock }
        : {
            key: 'block',
            label: t('admin.users.actions.block'),
            run: async () => {
              if (await dialog.confirm(t('admin.users.confirm.block'))) await onBlock();
            },
          },
    );
  }
  if (can.subscription) {
    dangerous.push(
      {
        key: 'resetTrial',
        label: t('admin.users.userActions.resetTrial'),
        run: async () => {
          if (
            await confirmed(
              'admin.users.userActions.confirmResetTrial.message',
              'admin.users.userActions.resetTrial',
              'admin.users.userActions.confirmResetTrial.title',
            )
          )
            await onResetTrial();
        },
      },
      {
        key: 'resetSubscription',
        label: t('admin.users.userActions.resetSubscription'),
        run: async () => {
          if (
            await confirmed(
              'admin.users.userActions.confirmResetSubscription.message',
              'admin.users.userActions.resetSubscription',
              'admin.users.userActions.confirmResetSubscription.title',
            )
          )
            await onResetSubscription();
        },
      },
    );
  }
  if (can.block) {
    dangerous.push({
      key: 'disable',
      label: t('admin.users.userActions.disable'),
      run: async () => {
        if (
          await confirmed(
            'admin.users.userActions.confirmDisable.message',
            'admin.users.userActions.disable',
            'admin.users.userActions.confirmDisable.title',
          )
        )
          await onDisable();
      },
    });
  }
  if (can.delete) {
    dangerous.push({
      key: 'delete',
      label: t('admin.users.userActions.delete'),
      danger: true,
      run: async () => {
        if (
          await confirmed(
            'admin.users.userActions.confirmDelete.message',
            'admin.users.userActions.delete',
            'admin.users.userActions.confirmDelete.title',
          )
        )
          await onDelete();
      },
    });
  }

  const itemClass =
    'block w-full rounded-lg px-3 py-2 text-left text-sm text-dark-200 transition-colors hover:bg-dark-700 focus-visible:bg-dark-700 focus-visible:outline-none disabled:opacity-50';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t('admin.users.detail.menu.more')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="btn-secondary h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-10"
      >
        <MoreIcon className="h-5 w-5" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-12 z-30 w-64 rounded-2xl border border-dark-700 bg-dark-800 p-1.5 shadow-2xl"
        >
          {reachabilityLink && (
            <Link
              role="menuitem"
              to={reachabilityLink}
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              {t('admin.users.detail.menu.checkConfigs')}
            </Link>
          )}
          {dangerous.length > 0 && (
            <>
              {reachabilityLink && <div className="my-1.5 border-t border-dark-700" />}
              <div className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-dark-500">
                {t('admin.users.detail.menu.confirmRequired')}
              </div>
              {dangerous.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                    item.run().catch(() => {});
                  }}
                  className={cn(itemClass, item.danger && 'text-error-400 hover:bg-error-500/10')}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
