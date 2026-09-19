import { useTranslation } from 'react-i18next';
import type { NodeInfo } from '@/api/adminRemnawave';
import { GlobeIcon, NetworkIcon, SparklesIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  isRouteReady,
  suggestedInterfaces,
  suggestedIps,
  type GeoCheckRouteMode,
} from './geoCheckRoute';

interface GeoCheckSetupProps {
  node: NodeInfo;
  mode: GeoCheckRouteMode;
  value: string;
  onModeChange: (mode: GeoCheckRouteMode) => void;
  onValueChange: (value: string) => void;
}

/** Выбор маршрута, с которого гнать проверку: по умолчанию / IP / интерфейс. */
export function GeoCheckSetup({
  node,
  mode,
  value,
  onModeChange,
  onValueChange,
}: GeoCheckSetupProps) {
  const { t } = useTranslation();

  const modes: Array<{ id: GeoCheckRouteMode; label: string }> = [
    { id: 'default', label: t('admin.remnawave.geoCheck.mode.default', 'Default') },
    { id: 'ip', label: t('admin.remnawave.geoCheck.mode.ip', 'IP address') },
    { id: 'interface', label: t('admin.remnawave.geoCheck.mode.interface', 'Interface') },
  ];

  const ips = suggestedIps(node);
  const interfaces = suggestedInterfaces(node);
  const suggestions = mode === 'ip' ? ips : mode === 'interface' ? interfaces : [];

  const hint =
    mode === 'default'
      ? t('admin.remnawave.geoCheck.hint.default', 'The node will use its default outbound route.')
      : mode === 'ip'
        ? t(
            'admin.remnawave.geoCheck.hint.ip',
            'Pick one of the node addresses or type any address.',
          )
        : t(
            'admin.remnawave.geoCheck.hint.interface',
            'Pick one of the node interfaces or type any name.',
          );

  const placeholder =
    mode === 'default'
      ? t('admin.remnawave.geoCheck.placeholder.default', 'Automatic')
      : mode === 'ip'
        ? '1.2.3.4'
        : 'eth0';

  const isInvalid = mode !== 'default' && value.trim().length > 0 && !isRouteReady(mode, value);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={t('admin.remnawave.geoCheck.mode.legend', 'Check route')}
        className="flex gap-1 rounded-xl bg-dark-800/50 p-1"
      >
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => onModeChange(item.id)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
              mode === item.id
                ? 'bg-accent-500/20 text-accent-400'
                : 'text-dark-400 hover:bg-dark-700/50 hover:text-dark-200',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="geocheck-route-value" className="block text-sm font-medium text-dark-200">
          {modes.find((item) => item.id === mode)?.label}
        </label>
        <p className="mt-0.5 text-xs text-dark-400">{hint}</p>

        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
            {mode === 'default' ? (
              <SparklesIcon className="h-4 w-4" />
            ) : mode === 'ip' ? (
              <GlobeIcon className="h-4 w-4" />
            ) : (
              <NetworkIcon className="h-4 w-4" />
            )}
          </span>
          <input
            id="geocheck-route-value"
            type="text"
            inputMode={mode === 'ip' ? 'numeric' : 'text'}
            autoComplete="off"
            spellCheck={false}
            disabled={mode === 'default'}
            value={mode === 'default' ? '' : value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            aria-invalid={isInvalid}
            className={cn(
              'input pl-9 font-mono disabled:cursor-not-allowed disabled:opacity-60',
              isInvalid && 'input-error',
            )}
          />
        </div>

        {isInvalid && (
          <p className="mt-1.5 text-xs text-error-400">
            {mode === 'ip'
              ? t('admin.remnawave.geoCheck.invalidIp', 'Enter a valid IPv4 or IPv6 address')
              : t('admin.remnawave.geoCheck.invalidInterface', 'Enter a valid interface name')}
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onValueChange(suggestion)}
                className={cn(
                  'max-w-full truncate rounded-lg px-2 py-1 font-mono text-[11px] transition-colors',
                  value.trim() === suggestion
                    ? 'bg-accent-500/20 text-accent-300'
                    : 'bg-dark-700/60 text-dark-300 hover:bg-dark-700 hover:text-dark-100',
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
