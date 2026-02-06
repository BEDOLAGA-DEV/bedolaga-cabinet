import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';

export default function BlacklistedScreen() {
  const { t } = useTranslation();
  const { blacklistedInfo } = useBlockingStore();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-950 p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-dark-800">
            <svg
              className="h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-2xl font-bold text-white">{t('blocking.blacklisted.title')}</h1>

        {/* Message */}
        <p className="mb-6 text-lg text-gray-400">{t('blocking.blacklisted.defaultMessage')}</p>

        {/* Reason */}
        {blacklistedInfo?.message && (
          <div className="mb-6 rounded-xl bg-dark-800/50 p-4">
            <p className="mb-1 text-sm text-gray-500">{t('blocking.blacklisted.reason')}:</p>
            <p className="text-gray-300">{blacklistedInfo.message}</p>
          </div>
        )}

        <p className="mt-8 text-sm text-gray-500">{t('blocking.blacklisted.contactSupport')}</p>
      </div>
    </div>
  );
}
