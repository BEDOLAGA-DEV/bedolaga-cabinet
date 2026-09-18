import { useTranslation } from 'react-i18next';
import { useIsTelegram } from '@/platform/hooks/usePlatform';
import { LogoutIcon } from './icons';

interface LogoutButtonProps {
  /** `menu` — пункт мобильного меню, `icon` — кнопка в шапке на широком экране. */
  variant: 'menu' | 'icon';
  onLogout: () => void;
}

/**
 * Выход есть только в браузере. В Telegram вход идёт по initData: после
 * «выхода» страница входа тут же входит обратно, кнопка лишь путает.
 */
export function LogoutButton({ variant, onLogout }: LogoutButtonProps) {
  const { t } = useTranslation();
  const isTelegram = useIsTelegram();
  if (isTelegram) return null;

  if (variant === 'menu') {
    return (
      <button type="button" onClick={onLogout} className="nav-item w-full text-error-400">
        <LogoutIcon className="h-5 w-5" />
        {t('nav.logout')}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onLogout}
      className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-2 text-dark-400 transition-colors duration-200 hover:bg-dark-700 hover:text-accent-400"
      title={t('nav.logout')}
    >
      <LogoutIcon className="h-5 w-5" />
    </button>
  );
}
