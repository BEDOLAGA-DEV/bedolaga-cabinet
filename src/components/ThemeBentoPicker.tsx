import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { COLOR_PRESETS, ColorPreset } from '../data/colorPresets'
import { hexToHsl, hslToHex, isValidHex, HSLColor } from '../utils/colorConversion'
import { ThemeColors, DEFAULT_THEME_COLORS } from '../types/theme'
import { applyThemeColors } from '../hooks/useThemeColors'

interface ThemeBentoPickerProps {
  currentColors: ThemeColors
  onColorsChange: (colors: ThemeColors) => void
  onSave: () => void
  isSaving: boolean
}

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
)

const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
)

const StatusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
)

const PaletteIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
  </svg>
)

function PresetCard({
  preset,
  isSelected,
  onClick,
}: {
  preset: ColorPreset
  isSelected: boolean
  onClick: () => void
}) {
  const { i18n } = useTranslation()
  const isRu = i18n.language === 'ru'

  return (
    <button
      onClick={onClick}
      className={`relative h-full w-full p-3 text-left transition-all duration-200 group rounded-2xl flex flex-col ${
        isSelected
          ? 'bg-dark-800/90 border-2 border-accent-500 shadow-lg shadow-accent-500/20 scale-[1.02] z-10'
          : 'bg-dark-900/60 border border-dark-700/50 hover:bg-dark-800/70 hover:border-dark-600/60 hover:scale-[1.01]'
      }`}
    >
      <div
        className="w-full h-12 rounded-xl mb-2.5 relative overflow-hidden shrink-0"
        style={{ backgroundColor: preset.preview.background }}
      >
        <div
          className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-lg shadow-md"
          style={{ backgroundColor: preset.preview.accent }}
        />
        <div
          className="absolute bottom-2.5 right-2 w-10 h-1 rounded-full opacity-60"
          style={{ backgroundColor: preset.preview.text }}
        />
        <div
          className="absolute bottom-5 right-2 w-7 h-1 rounded-full opacity-40"
          style={{ backgroundColor: preset.preview.text }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-dark-100 truncate">
            {isRu ? preset.nameRu : preset.name}
          </h4>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center text-white shrink-0">
            <CheckIcon />
          </div>
        )}
      </div>
    </button>
  )
}

function HSLSlider({
  label,
  value,
  onChange,
  max,
  gradient,
  suffix = '',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  max: number
  gradient: string
  suffix?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-dark-300">{label}</label>
        <span className="text-xs text-dark-500 font-mono tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
        style={{ background: gradient }}
      />
    </div>
  )
}

function CompactColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (color: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (newValue: string) => {
    let formatted = newValue.toUpperCase()
    if (!formatted.startsWith('#')) {
      formatted = '#' + formatted
    }
    setLocalValue(formatted)
    if (isValidHex(formatted)) {
      onChange(formatted)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (!isValidHex(localValue)) {
      setLocalValue(value)
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-dark-800/40 hover:bg-dark-800/60 transition-colors group">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="w-8 h-8 rounded-lg border border-dark-600/50 shadow-inner shrink-0 transition-transform hover:scale-105"
        style={{ backgroundColor: value }}
      />
      <div className="flex-1 min-w-0">
        <label className="text-[10px] uppercase tracking-wide text-dark-500 block leading-none mb-0.5">
          {label}
        </label>
        {isEditing ? (
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            autoFocus
            className="bg-transparent text-xs font-mono text-dark-200 w-full outline-none"
            maxLength={7}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-mono text-dark-300 hover:text-dark-100 transition-colors text-left"
          >
            {value.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  badge,
}: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string
}) {
  return (
    <div className="rounded-2xl bg-dark-900/50 border border-dark-700/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-dark-400">{icon}</div>
          <span className="text-sm font-medium text-dark-200">{title}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-dark-700/50 text-dark-400 font-mono">
              {badge}
            </span>
          )}
        </div>
        <div
          className={`text-dark-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <ChevronDownIcon />
        </div>
      </button>

      <div
        className={`grid transition-all duration-200 ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-dark-700/30">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ThemeBentoPicker({
  currentColors,
  onColorsChange,
  onSave,
  isSaving,
}: ThemeBentoPickerProps) {
  const { t } = useTranslation()

  const [hsl, setHsl] = useState<HSLColor>(() => hexToHsl(currentColors.accent))
  const [hexInput, setHexInput] = useState(currentColors.accent)
  const [hasChanges, setHasChanges] = useState(false)

  const [isPresetsOpen, setIsPresetsOpen] = useState(false)
  const [isAccentOpen, setIsAccentOpen] = useState(false)
  const [isDarkOpen, setIsDarkOpen] = useState(false)
  const [isLightOpen, setIsLightOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)

  const selectedPresetId = useMemo(() => {
    const match = COLOR_PRESETS.find(
      (p) =>
        p.colors.accent.toLowerCase() === currentColors.accent.toLowerCase() &&
        p.colors.darkBackground.toLowerCase() === currentColors.darkBackground.toLowerCase() &&
        p.colors.lightBackground.toLowerCase() === currentColors.lightBackground.toLowerCase()
    )
    return match?.id ?? null
  }, [currentColors.accent, currentColors.darkBackground, currentColors.lightBackground])

  useEffect(() => {
    setHsl(hexToHsl(currentColors.accent))
    setHexInput(currentColors.accent)
  }, [currentColors.accent])

  const updateColor = useCallback(
    (key: keyof ThemeColors, value: string) => {
      const newColors = { ...currentColors, [key]: value }
      onColorsChange(newColors)
      applyThemeColors(newColors)
      setHasChanges(true)
    },
    [currentColors, onColorsChange]
  )

  const updateAccentFromHsl = useCallback(
    (newHsl: HSLColor) => {
      setHsl(newHsl)
      const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l)
      setHexInput(newHex)
      updateColor('accent', newHex)
    },
    [updateColor]
  )

  const handleHexInputChange = (value: string) => {
    setHexInput(value)
    if (isValidHex(value)) {
      const newHsl = hexToHsl(value)
      setHsl(newHsl)
      updateColor('accent', value)
    }
  }

  const handlePresetSelect = (preset: ColorPreset) => {
    onColorsChange(preset.colors)
    applyThemeColors(preset.colors)
    setHasChanges(true)
  }

  const hueGradient = useMemo(() => {
    return `linear-gradient(to right, 
      hsl(0, ${hsl.s}%, ${hsl.l}%), 
      hsl(60, ${hsl.s}%, ${hsl.l}%), 
      hsl(120, ${hsl.s}%, ${hsl.l}%), 
      hsl(180, ${hsl.s}%, ${hsl.l}%), 
      hsl(240, ${hsl.s}%, ${hsl.l}%), 
      hsl(300, ${hsl.s}%, ${hsl.l}%), 
      hsl(360, ${hsl.s}%, ${hsl.l}%)
    )`
  }, [hsl.s, hsl.l])

  const saturationGradient = useMemo(() => {
    return `linear-gradient(to right, 
      hsl(${hsl.h}, 0%, ${hsl.l}%), 
      hsl(${hsl.h}, 100%, ${hsl.l}%)
    )`
  }, [hsl.h, hsl.l])

  const lightnessGradient = useMemo(() => {
    return `linear-gradient(to right, 
      hsl(${hsl.h}, ${hsl.s}%, 0%), 
      hsl(${hsl.h}, ${hsl.s}%, 50%), 
      hsl(${hsl.h}, ${hsl.s}%, 100%)
    )`
  }, [hsl.h, hsl.s])

  return (
    <div className="space-y-5">
      <CollapsibleSection
        title={t('admin.theme.quickPresets', 'Quick Presets')}
        icon={<PaletteIcon />}
        badge={`${COLOR_PRESETS.length}`}
        isOpen={isPresetsOpen}
        onToggle={() => setIsPresetsOpen(!isPresetsOpen)}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 auto-rows-fr gap-4 p-1">
          {COLOR_PRESETS.map((preset, index) => (
            <div key={preset.id} className="min-h-[100px]" style={{ '--stagger': index } as React.CSSProperties}>
              <PresetCard
                preset={preset}
                isSelected={selectedPresetId === preset.id}
                onClick={() => handlePresetSelect(preset)}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wide">
          {t('admin.theme.customizeColors', 'Customize Colors')}
        </h3>

        <CollapsibleSection
          title={t('admin.theme.accentColor', 'Accent Color')}
          icon={<PaletteIcon />}
          badge={hexInput.toUpperCase()}
          isOpen={isAccentOpen}
          onToggle={() => setIsAccentOpen(!isAccentOpen)}
        >
          <div className="space-y-4">
            <div
              className="w-full h-14 rounded-xl shadow-inner relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${hexInput} 0%, ${hslToHex(hsl.h, hsl.s, Math.max(20, hsl.l - 20))} 100%)`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="absolute bottom-2 right-3 text-white/80 text-xs font-mono drop-shadow">
                {hexInput.toUpperCase()}
              </div>
            </div>

            <HSLSlider
              label={t('admin.theme.hue', 'Hue')}
              value={hsl.h}
              onChange={(h) => updateAccentFromHsl({ ...hsl, h })}
              max={360}
              gradient={hueGradient}
              suffix="°"
            />

            <HSLSlider
              label={t('admin.theme.saturation', 'Saturation')}
              value={hsl.s}
              onChange={(s) => updateAccentFromHsl({ ...hsl, s })}
              max={100}
              gradient={saturationGradient}
              suffix="%"
            />

            <HSLSlider
              label={t('admin.theme.lightness', 'Lightness')}
              value={hsl.l}
              onChange={(l) => updateAccentFromHsl({ ...hsl, l })}
              max={100}
              gradient={lightnessGradient}
              suffix="%"
            />

            <div>
              <label className="text-xs font-medium text-dark-300 mb-1.5 block">
                {t('admin.theme.hexCode', 'HEX Code')}
              </label>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInputChange(e.target.value)}
                placeholder="#3b82f6"
                maxLength={7}
                className="input w-full text-sm font-mono uppercase"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={t('theme.darkTheme', 'Dark Theme')}
          icon={<MoonIcon />}
          isOpen={isDarkOpen}
          onToggle={() => setIsDarkOpen(!isDarkOpen)}
        >
          <div className="grid grid-cols-2 gap-2">
            <CompactColorInput
              label={t('theme.background', 'Background')}
              value={currentColors.darkBackground || DEFAULT_THEME_COLORS.darkBackground}
              onChange={(c) => updateColor('darkBackground', c)}
            />
            <CompactColorInput
              label={t('theme.surface', 'Surface')}
              value={currentColors.darkSurface || DEFAULT_THEME_COLORS.darkSurface}
              onChange={(c) => updateColor('darkSurface', c)}
            />
            <CompactColorInput
              label={t('theme.text', 'Text')}
              value={currentColors.darkText || DEFAULT_THEME_COLORS.darkText}
              onChange={(c) => updateColor('darkText', c)}
            />
            <CompactColorInput
              label={t('theme.textSecondary', 'Secondary')}
              value={currentColors.darkTextSecondary || DEFAULT_THEME_COLORS.darkTextSecondary}
              onChange={(c) => updateColor('darkTextSecondary', c)}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={t('theme.lightTheme', 'Light Theme')}
          icon={<SunIcon />}
          isOpen={isLightOpen}
          onToggle={() => setIsLightOpen(!isLightOpen)}
        >
          <div className="grid grid-cols-2 gap-2">
            <CompactColorInput
              label={t('theme.background', 'Background')}
              value={currentColors.lightBackground || DEFAULT_THEME_COLORS.lightBackground}
              onChange={(c) => updateColor('lightBackground', c)}
            />
            <CompactColorInput
              label={t('theme.surface', 'Surface')}
              value={currentColors.lightSurface || DEFAULT_THEME_COLORS.lightSurface}
              onChange={(c) => updateColor('lightSurface', c)}
            />
            <CompactColorInput
              label={t('theme.text', 'Text')}
              value={currentColors.lightText || DEFAULT_THEME_COLORS.lightText}
              onChange={(c) => updateColor('lightText', c)}
            />
            <CompactColorInput
              label={t('theme.textSecondary', 'Secondary')}
              value={currentColors.lightTextSecondary || DEFAULT_THEME_COLORS.lightTextSecondary}
              onChange={(c) => updateColor('lightTextSecondary', c)}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={t('theme.statusColors', 'Status Colors')}
          icon={<StatusIcon />}
          isOpen={isStatusOpen}
          onToggle={() => setIsStatusOpen(!isStatusOpen)}
        >
          <div className="grid grid-cols-3 gap-2">
            <CompactColorInput
              label={t('theme.success', 'Success')}
              value={currentColors.success || DEFAULT_THEME_COLORS.success}
              onChange={(c) => updateColor('success', c)}
            />
            <CompactColorInput
              label={t('theme.warning', 'Warning')}
              value={currentColors.warning || DEFAULT_THEME_COLORS.warning}
              onChange={(c) => updateColor('warning', c)}
            />
            <CompactColorInput
              label={t('theme.error', 'Error')}
              value={currentColors.error || DEFAULT_THEME_COLORS.error}
              onChange={(c) => updateColor('error', c)}
            />
          </div>
        </CollapsibleSection>
      </div>

      <div className="rounded-2xl bg-dark-900/50 border border-dark-700/40 p-4">
        <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wide mb-3">
          {t('theme.preview', 'Preview')}
        </h4>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary text-sm">{t('theme.previewButton', 'Primary')}</button>
          <button className="btn-secondary text-sm">
            {t('theme.previewSecondary', 'Secondary')}
          </button>
          <span className="badge-success">{t('theme.success', 'Success')}</span>
          <span className="badge-warning">{t('theme.warning', 'Warning')}</span>
          <span className="badge-error">{t('theme.error', 'Error')}</span>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end animate-fade-in">
          <button onClick={onSave} disabled={isSaving} className="btn-primary">
            {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </button>
        </div>
      )}
    </div>
  )
}
