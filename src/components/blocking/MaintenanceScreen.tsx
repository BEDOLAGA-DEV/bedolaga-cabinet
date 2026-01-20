import { useTranslation } from 'react-i18next'
import { useBlockingStore } from '../../store/blocking'

export default function MaintenanceScreen() {
  const { t } = useTranslation()
  const { maintenanceInfo } = useBlockingStore()

  return (
    <div className="fixed inset-0 z-[100] bg-dark-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-dark-800 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-4">
          {t('blocking.maintenance.title', 'Технические работы')}
        </h1>

        {/* Message */}
        <p className="text-gray-400 mb-6 text-lg">
          {maintenanceInfo?.message || t('blocking.maintenance.defaultMessage', 'Сервис временно недоступен. Проводятся технические работы.')}
        </p>

        {/* Reason */}
        {maintenanceInfo?.reason && (
          <div className="bg-dark-800/50 rounded-xl p-4 mb-6">
            <p className="text-gray-500 text-sm mb-1">
              {t('blocking.maintenance.reason', 'Причина')}:
            </p>
            <p className="text-gray-300">
              {maintenanceInfo.reason}
            </p>
          </div>
        )}

        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '600ms' }} />
        </div>

        <p className="text-gray-500 text-sm mt-4">
          {t('blocking.maintenance.waitMessage', 'Пожалуйста, подождите...')}
        </p>
      </div>
    </div>
  )
}
