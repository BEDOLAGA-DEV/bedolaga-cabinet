import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

// Convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

// Convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
};

// Convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

// Convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const PRESET_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#a855f7',
];

export function ColorPicker({ value, onChange, label, description, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [hsl, setHsl] = useState(() => {
    const rgb = hexToRgb(value);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
  });
  const [pickerPosition, setPickerPosition] = useState<{
    top: number;
    left: number;
    openUp: boolean;
  }>({ top: 0, left: 0, openUp: false });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
    const rgb = hexToRgb(value);
    setHsl(rgbToHsl(rgb.r, rgb.g, rgb.b));
  }, [value]);

  // Calculate picker position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const pickerHeight = 320;
    const pickerWidth = 280;
    const padding = 12;

    // Check if there's space below
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < pickerHeight + padding && spaceAbove > spaceBelow;

    // Calculate left position (ensure it stays in viewport)
    let left = rect.left;
    if (left + pickerWidth > window.innerWidth - padding) {
      left = window.innerWidth - pickerWidth - padding;
    }
    if (left < padding) left = padding;

    setPickerPosition({
      top: openUp ? rect.top - pickerHeight - 8 : rect.bottom + 8,
      left,
      openUp,
    });
  }, []);

  // Open picker
  const handleOpen = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
  }, [disabled, updatePosition]);

  // Close picker
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleResize = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as EventListener);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, handleClose, updatePosition]);

  // Update color from HSL
  const updateColorFromHsl = useCallback(
    (newHsl: { h: number; s: number; l: number }) => {
      const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      setHsl(newHsl);
      setLocalValue(hex);
      onChange(hex);
    },
    [onChange],
  );

  // Handle hue change
  const handleHueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateColorFromHsl({ ...hsl, h: parseInt(e.target.value) });
    },
    [hsl, updateColorFromHsl],
  );

  // Handle saturation change
  const handleSaturationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateColorFromHsl({ ...hsl, s: parseInt(e.target.value) });
    },
    [hsl, updateColorFromHsl],
  );

  // Handle lightness change
  const handleLightnessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateColorFromHsl({ ...hsl, l: parseInt(e.target.value) });
    },
    [hsl, updateColorFromHsl],
  );

  // Handle hex input
  const handleHexInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      if (newValue && !newValue.startsWith('#')) {
        newValue = '#' + newValue;
      }
      if (newValue === '' || newValue.match(/^#[0-9A-Fa-f]{0,6}$/)) {
        setLocalValue(newValue);
        if (newValue.match(/^#[0-9A-Fa-f]{6}$/)) {
          const rgb = hexToRgb(newValue);
          setHsl(rgbToHsl(rgb.r, rgb.g, rgb.b));
          onChange(newValue);
        }
      }
    },
    [onChange],
  );

  // Handle preset click
  const handlePresetClick = useCallback(
    (color: string) => {
      setLocalValue(color);
      const rgb = hexToRgb(color);
      setHsl(rgbToHsl(rgb.r, rgb.g, rgb.b));
      onChange(color);
      handleClose();
    },
    [onChange, handleClose],
  );

  // Picker content
  const pickerContent = isOpen ? (
    <div
      ref={pickerRef}
      className="fixed z-[9999] w-[280px] overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 shadow-2xl"
      style={{
        top: pickerPosition.top,
        left: pickerPosition.left,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Color preview header */}
      <div className="h-16 w-full" style={{ backgroundColor: localValue || '#000000' }} />

      {/* Controls */}
      <div className="space-y-4 p-4">
        {/* Hue slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dark-400">Hue</span>
            <span className="text-xs text-dark-500">{hsl.h}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={hsl.h}
            onChange={handleHueChange}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background:
                'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
          />
        </div>

        {/* Saturation slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dark-400">Saturation</span>
            <span className="text-xs text-dark-500">{hsl.s}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.s}
            onChange={handleSaturationChange}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`,
            }}
          />
        </div>

        {/* Lightness slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-dark-400">Lightness</span>
            <span className="text-xs text-dark-500">{hsl.l}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.l}
            onChange={handleLightnessChange}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, #000000, hsl(${hsl.h}, ${hsl.s}%, 50%), #ffffff)`,
            }}
          />
        </div>

        {/* Hex input */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-dark-400">HEX</span>
          <input
            type="text"
            value={localValue}
            onChange={handleHexInputChange}
            className="h-9 flex-1 rounded-lg border border-dark-700 bg-dark-800 px-3 font-mono text-sm uppercase text-dark-100 focus:border-accent-500 focus:outline-none"
            placeholder="#000000"
            maxLength={7}
          />
        </div>

        {/* Presets */}
        <div className="border-t border-dark-700 pt-2">
          <span className="mb-2 block text-xs font-medium text-dark-400">Presets</span>
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`aspect-square w-full rounded-lg transition-transform hover:scale-110 active:scale-95 ${
                  localValue.toLowerCase() === preset.toLowerCase()
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900'
                    : ''
                }`}
                style={{ backgroundColor: preset }}
                title={preset}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative min-w-0 overflow-hidden">
      <label className="mb-1 block truncate text-sm font-medium text-dark-200">{label}</label>
      {description && <p className="mb-2 truncate text-xs text-dark-500">{description}</p>}

      <div className="flex items-center gap-2">
        {/* Color preview button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="h-10 w-10 flex-shrink-0 rounded-xl border-2 border-dark-700 shadow-inner transition-all hover:scale-105 hover:border-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: localValue || '#000000' }}
          title={localValue}
        />

        {/* Hex input */}
        <input
          type="text"
          value={localValue}
          onChange={handleHexInputChange}
          disabled={disabled}
          className="h-10 min-w-0 flex-1 rounded-xl border border-dark-700 bg-dark-800 px-2 font-mono text-sm uppercase text-dark-100 focus:border-accent-500 focus:outline-none disabled:opacity-50"
          placeholder="#000000"
          maxLength={7}
        />
      </div>

      {/* Render picker in portal */}
      {typeof document !== 'undefined' && createPortal(pickerContent, document.body)}
    </div>
  );
}
