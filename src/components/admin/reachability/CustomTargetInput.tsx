import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/data-display';
import { XIcon } from '@/components/icons';

interface CustomTargetInputProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function CustomTargetInput({ values, onChange }: CustomTargetInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <Card size="md">
      <h2 className="text-lg font-semibold text-dark-100">
        {t('admin.reachability.targets.custom')}
      </h2>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder={t('admin.reachability.targets.customPlaceholder')}
          aria-label={t('admin.reachability.targets.custom')}
          className="input min-w-0 flex-1"
        />
        <button type="button" className="btn-secondary" onClick={add} disabled={!draft.trim()}>
          {t('admin.reachability.targets.customAdd')}
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="flex items-center gap-1 rounded-lg border border-dark-700/60 bg-dark-900 px-2 py-1 font-mono text-xs text-dark-100"
            >
              {value}
              <button
                type="button"
                aria-label={`${t('common.delete', 'Удалить')} ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="text-dark-400 hover:text-dark-100"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
