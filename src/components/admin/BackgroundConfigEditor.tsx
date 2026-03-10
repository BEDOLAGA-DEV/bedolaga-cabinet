import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { backgroundRegistry } from '@/components/ui/backgrounds/registry';
import { BackgroundPreview } from '@/components/backgrounds/BackgroundPreview';
import type {
  AnimationConfig,
  BackgroundType,
  SettingDefinition,
} from '@/components/ui/backgrounds/types';
import { Toggle } from './Toggle';
import { cn } from '@/lib/utils';

function SettingField({
  def,
  value,
  onChange,
  t,
}: {
  def: SettingDefinition;
  value: unknown;
  onChange: (val: unknown) => void;
  t: (key: string) => string;
}) {
  if (def.type === 'number') {
    const numVal = (value as number) ?? (def.default as number);
    const displayVal = numVal < 0.01 ? numVal.toExponential(1) : String(numVal);
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm text-dark-300">{t(def.label)}</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={numVal}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-24 accent-accent-500"
          />
          <span className="w-16 text-right text-xs tabular-nums text-dark-400">{displayVal}</span>
        </div>
      </div>
    );
  }

  if (def.type === 'color') {
    const colorVal = (value as string) ?? (def.default as string);
    const hexForInput = /^#[0-9a-fA-F]{3,8}$/.test(colorVal) ? colorVal : '#818cf8';
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm text-dark-300">{t(def.label)}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hexForInput}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-dark-600 bg-transparent"
          />
          <span className="w-16 text-right text-xs text-dark-400">{colorVal}</span>
        </div>
      </div>
    );
  }

  if (def.type === 'boolean') {
    const boolVal = (value as boolean) ?? (def.default as boolean);
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm text-dark-300">{t(def.label)}</label>
        <Toggle checked={boolVal} onChange={() => onChange(!boolVal)} />
      </div>
    );
  }

  if (def.type === 'select' && def.options) {
    const selectVal = (value as string) ?? (def.default as string);
    return (
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm text-dark-300">{t(def.label)}</label>
        <select
          value={selectVal}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-dark-600 bg-dark-700 px-3 py-1.5 text-sm text-dark-200 focus:border-accent-500 focus:outline-none"
        >
          {def.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label.startsWith('admin.') ? t(opt.label) : opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}

interface BackgroundConfigEditorProps {
  value: AnimationConfig;
  onChange: (config: AnimationConfig) => void;
}

export function BackgroundConfigEditor({ value: config, onChange }: BackgroundConfigEditorProps) {
  const { t } = useTranslation();

  const updateConfig = (patch: Partial<AnimationConfig>) => {
    onChange({ ...config, ...patch });
  };

  const updateSetting = (key: string, val: unknown) => {
    onChange({ ...config, settings: { ...config.settings, [key]: val } });
  };

  const handleTypeChange = (type: BackgroundType) => {
    const def = backgroundRegistry.find((d) => d.type === type);
    const defaults: Record<string, unknown> = {};
    if (def) {
      for (const s of def.settings) {
        defaults[s.key] = s.default;
      }
    }
    onChange({ ...config, type, settings: defaults });
  };

  const currentDef = useMemo(
    () => backgroundRegistry.find((d) => d.type === config.type),
    [config.type],
  );

  const categories = useMemo(() => {
    const cats = new Map<string, typeof backgroundRegistry>();
    for (const def of backgroundRegistry) {
      const list = cats.get(def.category) ?? [];
      list.push(def);
      cats.set(def.category, list);
    }
    return cats;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-dark-100">{t('admin.backgrounds.title')}</h3>
          <p className="text-sm text-dark-400">{t('admin.backgrounds.description')}</p>
        </div>
        <Toggle
          checked={config.enabled}
          onChange={() => updateConfig({ enabled: !config.enabled })}
        />
      </div>

      {config.enabled && (
        <>
          {/* Preview */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.backgrounds.preview')}
            </label>
            <BackgroundPreview
              type={config.type}
              settings={config.settings}
              opacity={config.opacity}
              blur={config.blur}
              className="h-48"
            />
          </div>

          {/* Type selector gallery */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.backgrounds.selectType')}
            </label>

            {/* None option */}
            <button
              onClick={() => handleTypeChange('none')}
              className={cn(
                'mb-3 w-full rounded-xl border p-3 text-left transition-colors',
                config.type === 'none'
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600',
              )}
            >
              <span className="text-sm font-medium text-dark-200">
                {t('admin.backgrounds.none')}
              </span>
              <span className="ml-2 text-xs text-dark-400">{t('admin.backgrounds.noneDesc')}</span>
            </button>

            {/* Background types by category */}
            <div className="space-y-4">
              {Array.from(categories.entries()).map(([category, defs]) => (
                <div key={category}>
                  <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-dark-500">
                    {t(`admin.backgrounds.category${category.toUpperCase()}`)}
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {defs.map((def) => (
                      <button
                        key={def.type}
                        onClick={() => handleTypeChange(def.type)}
                        className={cn(
                          'rounded-xl border p-3 text-left transition-colors',
                          config.type === def.type
                            ? 'border-accent-500 bg-accent-500/10'
                            : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600',
                        )}
                      >
                        <span className="block text-sm font-medium text-dark-200">
                          {t(def.labelKey)}
                        </span>
                        <span className="block text-xs text-dark-400">{t(def.descriptionKey)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-type settings */}
          {currentDef && currentDef.settings.length > 0 && (
            <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-4">
              <h4 className="mb-3 text-sm font-medium text-dark-200">
                {t('admin.backgrounds.settings')}
              </h4>
              <div className="space-y-3">
                {currentDef.settings.map((def) => (
                  <SettingField
                    key={def.key}
                    def={def}
                    value={config.settings[def.key]}
                    onChange={(val) => updateSetting(def.key, val)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Global settings */}
          <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-dark-300">
                  {t('admin.backgrounds.globalOpacity')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={config.opacity}
                    onChange={(e) => updateConfig({ opacity: parseFloat(e.target.value) })}
                    className="w-24 accent-accent-500"
                  />
                  <span className="w-14 text-right text-xs tabular-nums text-dark-400">
                    {config.opacity}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-dark-300">{t('admin.backgrounds.globalBlur')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={config.blur}
                    onChange={(e) => updateConfig({ blur: Number(e.target.value) })}
                    className="w-24 accent-accent-500"
                  />
                  <span className="w-14 text-right text-xs tabular-nums text-dark-400">
                    {config.blur}px
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm text-dark-300">
                    {t('admin.backgrounds.reducedOnMobile')}
                  </label>
                  <p className="text-xs text-dark-500">
                    {t('admin.backgrounds.reducedOnMobileDesc')}
                  </p>
                </div>
                <Toggle
                  checked={config.reducedOnMobile}
                  onChange={() => updateConfig({ reducedOnMobile: !config.reducedOnMobile })}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
