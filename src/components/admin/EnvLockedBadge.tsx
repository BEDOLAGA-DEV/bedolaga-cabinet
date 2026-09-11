import { useTranslation } from 'react-i18next';
import { LockIcon } from './icons';

/**
 * Пометка «Задано в .env»: ключ закреплён в окружении, база его не перекрывает,
 * из кабинета значение не изменить. Одна на все формы настроек — раньше форма
 * партнёрки молча принимала правку и «забывала» её после перезагрузки.
 */
export function EnvLockedBadge() {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-dark-600/50 px-2 py-0.5 text-xs font-medium text-dark-400"
      title={t('admin.settings.envLockedHint')}
    >
      <LockIcon />
      {t('admin.settings.envLocked')}
    </span>
  );
}
