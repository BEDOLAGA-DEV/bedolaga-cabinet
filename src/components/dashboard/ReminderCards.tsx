import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { remindersApi, type ReminderCard } from '@/api/reminders';
import { usePlatform } from '@/platform';
import { XIcon } from '@/components/icons';

const MAX_VISIBLE = 2;

export default function ReminderCards() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { openLink } = usePlatform();
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const lang = (i18n.language || 'ru').split('-')[0];

  // Без кэша: при каждом открытии главной — свежий список, поэтому после привязки
  // способа входа карточка не мигнёт старой версией.
  const { data } = useQuery({
    queryKey: ['reminders', 'active', lang],
    queryFn: () => remindersApi.getActive(lang),
    staleTime: 0,
    gcTime: 0,
    // Глобальный дефолт — false; напоминания должны обновляться при возврате
    // во вкладку (новое условие подошло / кто-то закрыл в другой вкладке).
    refetchOnWindowFocus: true,
  });

  const cards = (data ?? []).filter((card) => !hidden.has(card.id)).slice(0, MAX_VISIBLE);
  if (cards.length === 0) return null;

  const close = (card: ReminderCard) => {
    setHidden((prev) => new Set(prev).add(card.id));
    remindersApi.dismiss(card.id).catch(() => undefined);
  };

  const act = (card: ReminderCard) => {
    if (!card.button) return;
    if (card.button.kind === 'cabinet') navigate(card.button.target);
    else openLink(card.button.target);
  };

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <div
          key={card.id}
          className="relative overflow-hidden rounded-2xl border border-accent-500/30 bg-accent-500/5 p-4"
        >
          <button
            type="button"
            aria-label={t('dashboard.reminders.dismiss')}
            onClick={() => close(card)}
            className="absolute right-3 top-3 rounded-lg p-1 text-dark-400 hover:text-dark-100"
          >
            <XIcon />
          </button>
          <div className="pr-8 text-sm font-semibold text-dark-50">{card.title}</div>
          <div className="mt-1 whitespace-pre-line text-xs text-dark-300">{card.body}</div>
          {card.button && (
            <button
              type="button"
              onClick={() => act(card)}
              className="mt-3 rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-400"
            >
              {card.button.text}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
