import { useTranslation } from 'react-i18next';

/** Временная заглушка вкладки: заменяется в задачах C4–C7 плана, ключ comingSoon удалить в C7. */
export function ComingSoon() {
  const { t } = useTranslation();
  return <p className="text-sm text-dark-400">{t('admin.reachability.comingSoon')}</p>;
}
