import { useTranslation } from 'react-i18next';
import { useBlockingStore } from '../../store/blocking';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { WrenchIcon } from '@/components/icons';
import BlockingShell from './BlockingShell';

export default function MaintenanceScreen() {
  const { t } = useTranslation();
  const maintenanceInfo = useBlockingStore((state) => state.maintenanceInfo);
  const screenRef = useFocusTrap<HTMLDivElement>(true, { lockScroll: false });

  return (
    <BlockingShell
      screenRef={screenRef}
      titleId="maintenance-title"
      accent="warning"
      icon={<WrenchIcon className="h-9 w-9" />}
      title={t('blocking.maintenance.title')}
      description={maintenanceInfo?.message || t('blocking.maintenance.defaultMessage')}
      pulse
      footer={t('blocking.maintenance.waitMessage')}
    >
      {maintenanceInfo?.reason && (
        <div className="rounded-xl border border-dark-700/30 bg-dark-800/50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-dark-500">
            {t('blocking.maintenance.reason')}:
          </p>
          <p className="text-sm text-dark-300">{maintenanceInfo.reason}</p>
        </div>
      )}
    </BlockingShell>
  );
}
