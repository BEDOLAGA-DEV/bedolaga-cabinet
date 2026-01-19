import { useState, useRef, useEffect } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label: string
  description?: string
  disabled?: boolean
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#a855f7', // Purple
]

export function ColorPicker({ value, onChange, label, description, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setLocalValue(newColor)
    onChange(newColor)
  }

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value

    // Add # if not present
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue
    }

    // Validate hex format
    if (newValue === '' || newValue.match(/^#[0-9A-Fa-f]{0,6}$/)) {
      setLocalValue(newValue)

      // Only trigger onChange for valid complete hex
      if (newValue.match(/^#[0-9A-Fa-f]{6}$/)) {
        onChange(newValue)
      }
    }
  }

  const handlePresetClick = (color: string) => {
    setLocalValue(color)
    onChange(color)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-dark-200 mb-1">{label}</label>
      {description && <p className="text-xs text-dark-500 mb-2">{description}</p>}

      <div className="flex items-center gap-3">
        {/* Color preview button - min 44px for touch accessibility */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-11 h-11 rounded-lg border-2 border-dark-700 shadow-inner transition-all hover:scale-105 hover:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          style={{ backgroundColor: localValue || '#000000' }}
          title={localValue}
          aria-label={`Select color: ${localValue}`}
        />

        {/* Hex input */}
        <input
          type="text"
          value={localValue}
          onChange={handleHexInputChange}
          disabled={disabled}
          className="input w-28 py-2 font-mono text-sm uppercase"
          placeholder="#000000"
          maxLength={7}
        />

        {/* Hidden native color picker for direct access */}
        <input
          ref={colorInputRef}
          type="color"
          value={localValue || '#000000'}
          onChange={handleColorInputChange}
          disabled={disabled}
          className="sr-only"
        />

        {/* Native picker button - min 44px for touch accessibility */}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          disabled={disabled}
          className="btn-secondary min-w-[44px] min-h-[44px] p-2.5 disabled:opacity-50"
          title="Open color picker"
          aria-label="Open color picker"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
            />
          </svg>
        </button>
      </div>

      {/* Dropdown with presets */}
      {isOpen && (
        <div className="absolute z-50 mt-2 p-3 bg-dark-800 rounded-xl border border-dark-700 shadow-xl animate-fade-in">
          <div className="text-xs text-dark-400 mb-2">Preset colors</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border-2 transition-all hover:scale-105 ${
                  localValue === preset ? 'border-white ring-2 ring-white/30' : 'border-dark-600 hover:border-dark-500'
                }`}
                style={{ backgroundColor: preset }}
                title={preset}
                aria-label={`Select color ${preset}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
