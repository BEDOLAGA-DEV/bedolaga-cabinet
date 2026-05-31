import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { BanIcon } from '@/components/icons';

export default function BlacklistedScreen() {
  const { t } = useTranslation();
  const blacklistedInfo = useBlockingStore((state) => state.blacklistedInfo);
  const screenRef = useFocusTrap<HTMLDivElement>(true, { lockScroll: false });

  return (
    <div
      ref={screenRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="blacklisted-title"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-950 p-6"
    >
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-dark-800">
            <BanIcon className="h-12 w-12 text-error-500" />
          </div>
        </div>

        {/* Title */}
        <h1 id="blacklisted-title" className="mb-4 text-2xl font-bold text-white">
          {t('blocking.blacklisted.title')}
        </h1>

        {/* Message */}
        <p className="mb-6 text-lg text-dark-400">{t('blocking.blacklisted.defaultMessage')}</p>

        {/* Reason */}
        {blacklistedInfo?.message && (
          <div className="mb-6 rounded-xl bg-dark-800/50 p-4">
            <p className="mb-1 text-sm text-dark-500">{t('blocking.blacklisted.reason')}:</p>
            <p className="text-dark-300">{blacklistedInfo.message}</p>
          </div>
        )}

        <p className="mt-8 text-sm text-dark-500">{t('blocking.blacklisted.contactSupport')}</p>
      </div>
    </div>
  );
}
