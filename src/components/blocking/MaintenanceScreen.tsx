import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { WrenchIcon } from '@/components/icons';

export default function MaintenanceScreen() {
  const { t } = useTranslation();
  const maintenanceInfo = useBlockingStore((state) => state.maintenanceInfo);
  const screenRef = useFocusTrap<HTMLDivElement>(true, { lockScroll: false });

  return (
    <div
      ref={screenRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dark-950 p-6"
    >
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-dark-800">
            <WrenchIcon className="h-12 w-12 text-warning-500" />
          </div>
        </div>

        {/* Title */}
        <h1 id="maintenance-title" className="mb-4 text-2xl font-bold text-white">
          {t('blocking.maintenance.title')}
        </h1>

        {/* Message */}
        <p className="mb-6 text-lg text-dark-400">
          {maintenanceInfo?.message || t('blocking.maintenance.defaultMessage')}
        </p>

        {/* Reason */}
        {maintenanceInfo?.reason && (
          <div className="mb-6 rounded-xl bg-dark-800/50 p-4">
            <p className="mb-1 text-sm text-dark-500">{t('blocking.maintenance.reason')}:</p>
            <p className="text-dark-300">{maintenanceInfo.reason}</p>
          </div>
        )}

        {/* Decorative dots */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div
            className="h-2 w-2 animate-pulse rounded-full bg-warning-500"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="h-2 w-2 animate-pulse rounded-full bg-warning-500"
            style={{ animationDelay: '300ms' }}
          />
          <div
            className="h-2 w-2 animate-pulse rounded-full bg-warning-500"
            style={{ animationDelay: '600ms' }}
          />
        </div>

        <p className="mt-4 text-sm text-dark-500">{t('blocking.maintenance.waitMessage')}</p>
      </div>
    </div>
  );
}
