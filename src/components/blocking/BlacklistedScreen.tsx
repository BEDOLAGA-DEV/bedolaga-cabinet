import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { BanIcon } from '@/components/icons';
import BlockingShell from './BlockingShell';

export default function BlacklistedScreen() {
  const { t } = useTranslation();
  const blacklistedInfo = useBlockingStore((state) => state.blacklistedInfo);
  const screenRef = useFocusTrap<HTMLDivElement>(true, { lockScroll: false });

  return (
    <BlockingShell
      screenRef={screenRef}
      titleId="blacklisted-title"
      accent="error"
      icon={<BanIcon className="h-9 w-9" />}
      title={t('blocking.blacklisted.title')}
      description={t('blocking.blacklisted.defaultMessage')}
      footer={t('blocking.blacklisted.contactSupport')}
    >
      {blacklistedInfo?.message && (
        <div className="rounded-xl border border-dark-700/30 bg-dark-800/50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-dark-500">
            {t('blocking.blacklisted.reason')}:
          </p>
          <p className="text-sm text-dark-300">{blacklistedInfo.message}</p>
        </div>
      )}
    </BlockingShell>
  );
}
