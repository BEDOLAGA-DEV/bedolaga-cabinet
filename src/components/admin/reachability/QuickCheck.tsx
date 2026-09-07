import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/primitives';
import { REACHABILITY_HISTORY_PATH, REACHABILITY_OTHER_PATH } from './deepLink';
import { detectCheckMode } from './checkMode';

/**
 * Первое действие раздела: проверить один адрес, конфиг или подписку. Поле на виду, вкладка
 * одиночной проверки выбирается по вводу, значение подставляется в форму через `?q=`.
 */
export function QuickCheck() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const base = 'admin.reachability';
  const text = value.trim();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text) return;
    const params = new URLSearchParams({ kind: detectCheckMode(text), q: text });
    navigate(`${REACHABILITY_OTHER_PATH}?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="reachability-quick" className="sr-only">
        {t(`${base}.fleet.other`)}
      </label>
      <div className="flex gap-2">
        <input
          id="reachability-quick"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t(`${base}.quick.placeholder`)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          className="input min-w-0 flex-1 font-mono text-sm"
        />
        <Button type="submit" variant="secondary" disabled={!text} className="shrink-0">
          {t(`${base}.quick.check`)}
        </Button>
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-400">
        <span>{t(`${base}.quick.hint`)}</span>
        <Link
          to={`${REACHABILITY_OTHER_PATH}?kind=cidr`}
          className="text-accent-400 hover:underline"
        >
          {t(`${base}.quick.cidr`)}
        </Link>
        <Link to={REACHABILITY_HISTORY_PATH} className="text-accent-400 hover:underline">
          {t(`${base}.fleet.history`)}
        </Link>
      </p>
    </form>
  );
}
