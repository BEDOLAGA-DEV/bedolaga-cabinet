import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useHaptic } from '../../platform';
import { useTheme } from '../../hooks/useTheme';
import { useTrafficZone } from '../../hooks/useTrafficZone';
import { getGlassColors } from '../../utils/glassTheme';
import { HoverBorderGradient } from '../ui/hover-border-gradient';

interface ConnectDeviceTileProps {
  subscription: {
    id: number;
    device_limit: number;
    subscription_url?: string | null;
  };
  connectedDevices: number;
  /** Процент израсходованного трафика — от него зависит акцентный цвет плитки. */
  usedPercent?: number;
}

/**
 * Плитка «Подключить устройство».
 *
 * Живёт и в карточке активной подписки, и на главной: пользователь,
 * которому подписку выдал бонус рекламной кампании, попадает на главную
 * с готовым доступом — и без этой плитки не понимает, что делать дальше.
 */
export default function ConnectDeviceTile({
  subscription,
  connectedDevices,
  usedPercent = 0,
}: ConnectDeviceTileProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const haptic = useHaptic();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const zone = useTrafficZone(usedPercent);

  const isAtDeviceLimit =
    subscription.device_limit > 0 && connectedDevices >= subscription.device_limit;

  if (!subscription.subscription_url) return null;

  return (
    <HoverBorderGradient
      as="button"
      accentColor={zone.mainHex}
      disabled={isAtDeviceLimit}
      onClick={() => {
        if (isAtDeviceLimit) {
          haptic.notification('error');
          return;
        }
        navigate(`/connection?sub=${subscription.id}`);
      }}
      className={`mb-2.5 flex w-full items-center gap-3.5 rounded-[14px] p-3.5 text-left transition-shadow duration-300 ${isAtDeviceLimit ? 'cursor-not-allowed opacity-50' : ''}`}
      data-onboarding="connect-devices"
      style={{ fontFamily: 'inherit' }}
    >
      {/* Monitor icon */}
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] transition-colors duration-500"
        style={{ background: `rgba(${zone.mainVarRaw}, 0.07)` }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={zone.mainVar}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M12 17v4M8 21h8" />
          <path d="M12 8v4M10 10h4" opacity="0.7" />
        </svg>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold tracking-tight text-dark-50">
          {t('dashboard.connectDevice')}
        </div>
        <div className="mt-0.5 text-[11px] text-dark-50/30">
          {subscription.device_limit === 0
            ? t('dashboard.devicesConnectedUnlimited', { used: connectedDevices })
            : t('dashboard.devicesOfMax', {
                used: connectedDevices,
                max: subscription.device_limit,
              })}
        </div>
        {isAtDeviceLimit && (
          <div
            className="mt-1 text-[10px] font-medium"
            style={{ color: 'rgb(var(--color-warning-400))' }}
          >
            {t('dashboard.deviceLimitReached')}
          </div>
        )}
      </div>

      {/* Device indicator */}
      {subscription.device_limit === 0 ? (
        <div className="flex flex-shrink-0 items-center text-lg text-dark-50/40" aria-hidden="true">
          ∞
        </div>
      ) : subscription.device_limit <= 10 ? (
        <div className="flex flex-shrink-0 gap-1.5" aria-hidden="true">
          {Array.from({ length: subscription.device_limit }, (_, i) => (
            <div
              key={i}
              className="h-[7px] w-[7px] rounded-full transition-all duration-300"
              style={{
                background: i < connectedDevices ? zone.mainVar : g.textGhost,
                boxShadow: i < connectedDevices ? `0 0 6px rgba(${zone.mainVarRaw}, 0.31)` : 'none',
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex w-16 flex-shrink-0 items-center" aria-hidden="true">
          <div
            className="h-[6px] w-full overflow-hidden rounded-full"
            style={{ background: g.textGhost }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round((connectedDevices / subscription.device_limit) * 100)}%`,
                background: zone.mainVar,
                boxShadow: `0 0 8px rgba(${zone.mainVarRaw}, 0.25)`,
                minWidth: connectedDevices > 0 ? '4px' : '0px',
              }}
            />
          </div>
        </div>
      )}
    </HoverBorderGradient>
  );
}
