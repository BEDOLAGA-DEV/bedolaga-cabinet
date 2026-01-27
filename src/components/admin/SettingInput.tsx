import { useState, useRef, useEffect } from 'react';
import { SettingDefinition } from '../../api/adminSettings';
import { CheckIcon, CloseIcon, EditIcon } from './icons';

interface SettingInputProps {
  setting: SettingDefinition;
  onUpdate: (value: string) => void;
  disabled?: boolean;
}

// Check if value is likely JSON or multi-line
function isLongValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const str = String(value);
  return str.length > 50 || str.includes('\n') || str.startsWith('[') || str.startsWith('{');
}

// Check if key suggests it's a list or JSON config
function isListOrJsonKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('_items') ||
    lowerKey.includes('_config') ||
    lowerKey.includes('_keywords') ||
    lowerKey.includes('_list') ||
    lowerKey.includes('_json') ||
    lowerKey.includes('_template') ||
    lowerKey.includes('_periods') ||
    lowerKey.includes('_discounts') ||
    lowerKey.includes('_packages')
  );
}

export function SettingInput({ setting, onUpdate, disabled }: SettingInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = String(setting.current ?? '');
  const needsTextarea = isLongValue(currentValue) || isListOrJsonKey(setting.key);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
    }
  }, [value, isEditing]);

  const handleStart = () => {
    setValue(currentValue);
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate(value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue('');
  };

  // Dropdown for choices
  if (setting.choices && setting.choices.length > 0) {
    return (
      <select
        value={currentValue}
        onChange={(e) => onUpdate(e.target.value)}
        disabled={disabled}
        className="min-w-[140px] cursor-pointer rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-dark-100 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/30 disabled:opacity-50"
      >
        {setting.choices.map((choice, idx) => (
          <option key={idx} value={String(choice.value)}>
            {choice.label}
          </option>
        ))}
      </select>
    );
  }

  // Editing mode - Textarea for long values
  if (isEditing && needsTextarea) {
    return (
      <div className="w-full space-y-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            // Ctrl+Enter to save
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
          }}
          autoFocus
          placeholder="Введите значение..."
          className="min-h-[100px] w-full resize-none rounded-xl border border-accent-500 bg-dark-700 px-4 py-3 font-mono text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-dark-500">Ctrl+Enter для сохранения</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg bg-dark-600 px-3 py-1.5 text-sm text-dark-300 transition-colors hover:bg-dark-500"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-accent-600"
            >
              <CheckIcon />
              Сохранить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Editing mode - Regular input
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type={setting.type === 'int' || setting.type === 'float' ? 'number' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
          placeholder="Введите значение..."
          className="w-48 rounded-lg border border-accent-500 bg-dark-700 px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-accent-500/30 sm:w-56"
        />
        <button
          onClick={handleSave}
          className="rounded-lg bg-accent-500 p-2 text-white transition-colors hover:bg-accent-600"
          title="Сохранить (Enter)"
        >
          <CheckIcon />
        </button>
        <button
          onClick={handleCancel}
          className="rounded-lg bg-dark-600 p-2 text-dark-300 transition-colors hover:bg-dark-500"
          title="Отмена (Esc)"
        >
          <CloseIcon />
        </button>
      </div>
    );
  }

  // Display mode - Long value preview
  if (needsTextarea) {
    const displayValue = currentValue || '-';
    const previewValue =
      displayValue.length > 60 ? displayValue.slice(0, 60) + '...' : displayValue;

    return (
      <button
        onClick={handleStart}
        disabled={disabled}
        className="group w-full rounded-xl border border-dark-600 bg-dark-700/50 px-4 py-3 text-left font-mono text-sm text-dark-200 transition-colors hover:border-dark-500 hover:bg-dark-700 disabled:opacity-50"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 flex-1 break-all">{previewValue}</span>
          <span className="flex-shrink-0 text-dark-500 transition-colors group-hover:text-accent-400">
            <EditIcon />
          </span>
        </div>
      </button>
    );
  }

  // Display mode - Short value
  return (
    <button
      onClick={handleStart}
      disabled={disabled}
      className="group flex min-w-[100px] max-w-[200px] items-center gap-2 truncate rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-left font-mono text-sm text-dark-200 transition-colors hover:border-dark-500 hover:bg-dark-600 disabled:opacity-50"
    >
      <span className="flex-1 truncate">{currentValue || '-'}</span>
      <span className="text-dark-500 opacity-0 transition-colors group-hover:text-accent-400 group-hover:opacity-100">
        <EditIcon />
      </span>
    </button>
  );
}
