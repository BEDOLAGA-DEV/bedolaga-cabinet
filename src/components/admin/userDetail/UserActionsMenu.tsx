import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MoreIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useDestructiveConfirm, useNativeDialog } from '@/platform/hooks/useNativeDialog';

export interface UserMenuActions {
  block: () => Promise<boolean>;
  unblock: () => Promise<boolean>;
  resetTrial: () => Promise<boolean>;
  resetSubscriptions: () => Promise<boolean>;
  disable: () => Promise<boolean>;
  deleteUser: () => Promise<boolean>;
}

interface UserActionsMenuProps {
  blocked: boolean;
  busy: boolean;
  /** Проверка конфигов через операторов РФ; null — раздел недоступен. */
  reachabilityLink: string | null;
  can: {
    block: boolean;
    subscription: boolean;
    delete: boolean;
    promoGroup: boolean;
    restrictions: boolean;
  };
  actions: UserMenuActions;
  /** Открыть правку промогруппы / ограничений в «Обзоре». */
  onEditPromoGroup: () => void;
  onEditRestrictions: () => void;
  className?: string;
}

/**
 * Редкие и опасные действия — за «⋯», а не в ряду с «Написать». Меню на Radix:
 * стрелки, Esc, фокус. Опасное подтверждается системным диалогом кабинета
 * (в Mini App — родным попапом), красным — только удаление.
 */
export function UserActionsMenu({
  blocked,
  busy,
  reachabilityLink,
  can,
  actions,
  onEditPromoGroup,
  onEditRestrictions,
  className,
}: UserActionsMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const rare = [
    reachabilityLink && {
      key: 'configs',
      label: t('admin.users.detail.menu.checkConfigs'),
      run: () => navigate(reachabilityLink),
    },
    can.promoGroup && {
      key: 'promo',
      label: t('admin.users.detail.menu.promoGroup'),
      run: onEditPromoGroup,
    },
    can.restrictions && {
      key: 'restrictions',
      label: t('admin.users.detail.menu.restrictions'),
      run: onEditRestrictions,
    },
  ].filter(Boolean) as { key: string; label: string; run: () => void }[];

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
    can.subscription && {
      key: 'resetSubscriptions',
      label: `${t(`${ns}.resetSubscription`)}…`,
      run: confirmThen('confirmResetSubscription', 'resetSubscription', actions.resetSubscriptions),
    },
    can.block && {
      key: 'disable',
      label: `${t(`${ns}.disable`)}…`,
      run: confirmThen('confirmDisable', 'disable', actions.disable),
    },
    can.delete && {
      key: 'delete',
      label: `${t(`${ns}.delete`)}…`,
      danger: true,
      run: confirmThen('confirmDelete', 'delete', actions.deleteUser),
    },
  ].filter(Boolean) as { key: string; label: string; danger?: boolean; run: () => void }[];

  if (rare.length === 0 && dangerous.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t('admin.users.detail.menu.more')}
        className={cn('btn-secondary h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-10', className)}
      >
        <MoreIcon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {rare.map((item) => (
          <DropdownMenuItem key={item.key} onSelect={item.run}>
            {item.label}
          </DropdownMenuItem>
        ))}
        {rare.length > 0 && dangerous.length > 0 && <DropdownMenuSeparator />}
        {dangerous.length > 0 && (
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-dark-500">
            {t('admin.users.detail.menu.confirmRequired')}
          </DropdownMenuLabel>
        )}
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
