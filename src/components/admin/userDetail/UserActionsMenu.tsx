import { useTranslation } from 'react-i18next';
import { MoreIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useDestructiveConfirm, useNativeDialog } from '@/platform/hooks/useNativeDialog';

export interface UserMenuActions {
  block: () => Promise<boolean>;
  unblock: () => Promise<boolean>;
  resetTrial: () => Promise<boolean>;
  disable: () => Promise<boolean>;
  deleteUser: () => Promise<boolean>;
}

interface UserActionsMenuProps {
  blocked: boolean;
  busy: boolean;
  can: {
    block: boolean;
    subscription: boolean;
    delete: boolean;
  };
  actions: UserMenuActions;
  className?: string;
}

/**
 * Редкие и опасные действия с аккаунтом — за «⋯», а не в ряду с «Написать». Промогруппа
 * и ограничения правятся на месте в «Обзоре», подписка — в своей вкладке: здесь их не
 * повторяем. Меню на Radix:
 * стрелки, Esc, фокус. Опасное подтверждается системным диалогом кабинета
 * (в Mini App — родным попапом), красным — только удаление.
 */
export function UserActionsMenu({ blocked, busy, can, actions, className }: UserActionsMenuProps) {
  const { t } = useTranslation();
  const dialog = useNativeDialog();
  const confirmDestructive = useDestructiveConfirm();
  const ns = 'admin.users.userActions';

  /** Системное подтверждение: текст и заголовок из `confirmX`, кнопка — названием действия. */
  const confirmThen =
    (key: string, actionKey: string, action: () => Promise<boolean>) => async () => {
      const ok = await confirmDestructive(
        t(`${ns}.${key}.message`),
        t(`${ns}.${actionKey}`),
        t(`${ns}.${key}.title`),
      );
      if (ok) await action();
    };

  const dangerous = [
    can.block &&
      (blocked
        ? {
            key: 'unblock',
            label: t('admin.users.actions.unblock'),
            run: () => void actions.unblock(),
          }
        : {
            key: 'block',
            label: t('admin.users.actions.block'),
            run: async () => {
              if (await dialog.confirm(t('admin.users.confirm.block'))) await actions.block();
            },
          }),
    can.subscription && {
      key: 'resetTrial',
      label: t(`${ns}.resetTrial`),
      run: confirmThen('confirmResetTrial', 'resetTrial', actions.resetTrial),
    },
    can.block && {
      key: 'disable',
      label: t(`${ns}.disable`),
      run: confirmThen('confirmDisable', 'disable', actions.disable),
    },
    can.delete && {
      key: 'delete',
      label: t(`${ns}.delete`),
      danger: true,
      run: confirmThen('confirmDelete', 'delete', actions.deleteUser),
    },
  ].filter(Boolean) as { key: string; label: string; danger?: boolean; run: () => void }[];

  if (dangerous.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t('admin.users.detail.menu.more')}
        className={cn('btn-secondary h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-10', className)}
      >
        <MoreIcon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {dangerous.map((item) => (
          <DropdownMenuItem
            key={item.key}
            disabled={busy}
            destructive={item.danger}
            onSelect={item.run}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
