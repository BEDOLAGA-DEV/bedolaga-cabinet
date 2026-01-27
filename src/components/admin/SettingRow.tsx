import { useTranslation } from 'react-i18next';
import { SettingDefinition } from '../../api/adminSettings';
import { StarIcon, LockIcon, RefreshIcon } from './icons';
import { SettingInput } from './SettingInput';
import { Toggle } from './Toggle';
import { formatSettingKey, stripHtml } from './utils';

interface SettingRowProps {
  setting: SettingDefinition;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUpdate: (value: string) => void;
  onReset: () => void;
  isUpdating?: boolean;
  isResetting?: boolean;
}

export function SettingRow({
  setting,
  isFavorite,
  onToggleFavorite,
  onUpdate,
  onReset,
  isUpdating,
  isResetting,
}: SettingRowProps) {
  const { t } = useTranslation();

  const formattedKey = formatSettingKey(setting.name || setting.key);
  const displayName = t(`admin.settings.settingNames.${formattedKey}`, formattedKey);
  const description = setting.hint?.description ? stripHtml(setting.hint.description) : null;

  // Check if this is a long/complex value
  const isLongValue = (() => {
    const val = String(setting.current ?? '');
    const key = setting.key.toLowerCase();
    return (
      val.length > 50 ||
      val.includes('\n') ||
      val.startsWith('[') ||
      val.startsWith('{') ||
      key.includes('_items') ||
      key.includes('_config') ||
      key.includes('_keywords') ||
      key.includes('_template') ||
      key.includes('_packages')
    );
  })();

  return (
    <div className="group rounded-2xl border border-dark-700/40 bg-dark-800/40 p-4 transition-all hover:border-dark-600/60 hover:bg-dark-800/60 sm:p-5">
      {/* Header row - name, badges, favorite */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-dark-100">{displayName}</h3>
            {setting.has_override && (
              <span className="rounded-full bg-warning-500/20 px-2 py-0.5 text-xs font-medium text-warning-400">
                {t('admin.settings.modified')}
              </span>
            )}
            {setting.read_only && (
              <span className="flex items-center gap-1 rounded-full bg-dark-600/50 px-2 py-0.5 text-xs font-medium text-dark-400">
                <LockIcon />
                {t('admin.settings.readOnly')}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-dark-400">{description}</p>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={onToggleFavorite}
          className={`flex-shrink-0 rounded-xl p-2 transition-all ${
            isFavorite
              ? 'bg-warning-500/15 text-warning-400 hover:bg-warning-500/25'
              : 'text-dark-500 opacity-0 hover:bg-dark-700/50 hover:text-warning-400 group-hover:opacity-100'
          }`}
          title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
        >
          <StarIcon filled={isFavorite} />
        </button>
      </div>

      {/* Setting key (muted) */}
      <div className="mb-3">
        <code className="rounded bg-dark-900/50 px-2 py-1 font-mono text-xs text-dark-500">
          {setting.key}
        </code>
      </div>

      {/* Control section */}
      <div
        className={`${isLongValue ? '' : 'flex items-center justify-between gap-3'} border-t border-dark-700/30 pt-3`}
      >
        {setting.read_only ? (
          // Read-only display
          <div className="flex items-center gap-2 rounded-lg bg-dark-700/30 px-4 py-2.5 text-dark-300">
            <span className="break-all font-mono text-sm">{String(setting.current ?? '-')}</span>
          </div>
        ) : setting.type === 'bool' ? (
          // Boolean toggle
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-dark-400">
              {setting.current === true || setting.current === 'true' ? 'Включено' : 'Выключено'}
            </span>
            <div className="flex items-center gap-2">
              <Toggle
                checked={setting.current === true || setting.current === 'true'}
                onChange={() =>
                  onUpdate(
                    setting.current === true || setting.current === 'true' ? 'false' : 'true',
                  )
                }
                disabled={isUpdating}
              />
              {/* Reset button for boolean */}
              {setting.has_override && (
                <button
                  onClick={onReset}
                  disabled={isResetting}
                  className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-50"
                  title={t('admin.settings.reset')}
                >
                  <RefreshIcon />
                </button>
              )}
            </div>
          </div>
        ) : (
          // Input field
          <div
            className={`${isLongValue ? 'w-full' : 'flex flex-1 items-center justify-end gap-2'}`}
          >
            <SettingInput setting={setting} onUpdate={onUpdate} disabled={isUpdating} />
            {/* Reset button for non-long values */}
            {!isLongValue && setting.has_override && (
              <button
                onClick={onReset}
                disabled={isResetting}
                className="flex-shrink-0 rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-50"
                title={t('admin.settings.reset')}
              >
                <RefreshIcon />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reset button for long values - shown below */}
      {isLongValue && setting.has_override && !setting.read_only && setting.type !== 'bool' && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-50"
            title={t('admin.settings.reset')}
          >
            <RefreshIcon />
            <span>Сбросить</span>
          </button>
        </div>
      )}
    </div>
  );
}
